// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/security/Pausable.sol';
import {SafeMath} from '@openzeppelin/contracts/utils/math/SafeMath.sol';

import {IVerifier} from './interfaces/IVerifier.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';
import {IFeeDistributor} from './interfaces/IFeeDistributor.sol';
import {IERC20Permit} from './interfaces/IERC20Permit.sol';
import {IDefiBridge} from './interfaces/IDefiBridge.sol';

import {Decoder} from './Decoder.sol';
import {AztecTypes} from './AztecTypes.sol';

import {TokenTransfers} from './libraries/TokenTransfers.sol';
import './libraries/RollupProcessorLibrary.sol';

/**
 * @title Rollup Processor
 * @dev Smart contract responsible for processing Aztec zkRollups, including relaying them to a verifier
 * contract for validation and performing all relevant ERC20 token transfers
 */
contract RollupProcessor is IRollupProcessor, Decoder, Ownable, Pausable {
    using SafeMath for uint256;

    /*----------------------------------------
      ERROR TAGS
      ----------------------------------------*/
    error REENTRANCY_MUTEX_SET();
    error INVALID_ASSET_ID();
    error INVALID_ASSET_ADDRESS();
    error PROOF_VERIFICATION_FAILED();
    error INCORRECT_STATE_HASH(bytes32 oldStateHash, bytes32 newStateHash);
    error INCORRECT_DATA_START_INDEX(uint256 providedIndex, uint256 expectedIndex);
    error BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS(uint256 outputAssetId);
    error INCORRECT_PREVIOUS_DEFI_INTERACTION_HASH(
        bytes32 providedDefiInteractionHash,
        bytes32 expectedDefiInteractionHash
    );
    error ZERO_TOTAL_INPUT_VALUE();
    error ARRAY_OVERFLOW();
    error ZERO_BRIDGE_ADDRESS_ID();
    error ASYNC_CALLBACK_BAD_CALLER_ADDRESS();
    error MSG_VALUE_WRONG_AMOUNT();
    error TOKEN_TRANSFER_FAILED();
    error WITHDRAW_TO_ZERO_ADDRESS();
    error INSUFFICIENT_DEPOSIT();
    error INVALID_LINKED_TOKEN_ADDRESS();
    error INVALID_LINKED_BRIDGE_ADDRESS();
    error TOKEN_ASSET_IS_NOT_LINKED();
    error DEPOSIT_TOKENS_WRONG_PAYMENT_TYPE();
    error INSUFFICIENT_TOKEN_APPROVAL();
    error INVALID_PROVIDER();
    error INVALID_BRIDGE_ID();
    error INVALID_BRIDGE_ADDRESS();
    error NONZERO_OUTPUT_VALUE_ON_NOT_USED_ASSET(uint256 outputValue);
    error PUBLIC_INPUTS_HASH_VERIFICATION_FAILED(uint256, uint256);

    /*----------------------------------------
      FUNCTION SELECTORS (PRECOMPUTED)
      ----------------------------------------*/
    // DEFI_BRIDGE_PROXY_CONVERT_SELECTOR = function signature of:
    //   function convert(
    //       address,
    //       AztecTypes.AztecAsset memory inputAssetA,
    //       AztecTypes.AztecAsset memory inputAssetB,
    //       AztecTypes.AztecAsset memory outputAssetA,
    //       AztecTypes.AztecAsset memory outputAssetB,
    //       uint256 totalInputValue,
    //       uint256 interactionNonce,
    //       uint256 auxData,
    //       uint256 ethPaymentsSlot)
    // N.B. this is the selector of the 'convert' function of the DefiBridgeProxy contract.
    //      This has a different interface to the IDefiBridge.convert function
    bytes4 private constant DEFI_BRIDGE_PROXY_CONVERT_SELECTOR = 0xffd8e7b7;

    /*----------------------------------------
      CONSTANT STATE VARIABLES
      ----------------------------------------*/
    uint256 private constant ethAssetId = 0; // if assetId == ethAssetId, treat as native ETH and not ERC20 token

    // starting root hash of the DeFi interaction result Merkle tree
    bytes32 private constant INIT_DEFI_ROOT = 0x0170467ae338aaf3fd093965165b8636446f09eeb15ab3d36df2e31dd718883d;

    bytes32 private constant DEFI_BRIDGE_PROCESSED_SIGHASH =
        0x1ccb5390975e3d07503983a09c3b6a5d11a0e40c4cb4094a7187655f643ef7b4;

    // Bit offsets and bit masks used to convert a `uint256 bridgeId` into a BridgeData member
    uint256 private constant INPUT_ASSET_ID_SHIFT = 32;
    uint256 private constant OUTPUT_ASSET_ID_A_SHIFT = 62;
    uint256 private constant OUTPUT_ASSET_ID_B_SHIFT = 92;
    uint256 private constant LINKED_INTERACTION_NONCE_SHIFT = 122;
    uint256 private constant BITCONFIG_SHIFT = 154;
    uint256 private constant AUX_DATA_SHIFT = 186;
    uint256 private constant MASK_THIRTY_TWO_BITS = 0xffffffff;
    uint256 private constant MASK_THIRTY_BITS = 0x3fffffff;
    uint256 private constant MASK_SIXTY_FOUR_BITS = 0xffffffffffffffff;

    /*----------------------------------------
      PRIVATE/INTERNAL STATE VARIABLES
      TODO: why aren't all of these private or internal?
      ----------------------------------------*/
    // We need to cap the amount of gas sent to the DeFi bridge contract for two reasons.
    // 1: To provide consistency to rollup providers around costs.
    // 2: To prevent griefing attacks where a bridge consumes all our gas.
    uint256 private gasSentToBridgeProxy = 300000;

    // Mapping which maps an asset address to a bool, determining whether it supports
    // permit as according to ERC-2612
    mapping(address => bool) private assetPermitSupport;

    // Used to guard against re-entrancy attacks when processing DeFi bridge transactions
    bool private reentrancyMutex = false;

    // asyncDefiInteractionHashes and defiInteractionHashes are custom implementations of an array type!!
    // we store the length fields for each array inside the `rollupState` storage slot
    // we access array elements in the traditional manner: array.slot[i] = keccak256(array.slot + i)
    // this reduces the number of storage slots we write to when processing a rollup
    // (each slot costs 5,000 gas to update. Repeated modifications to the same slot in a tx only cost 100 gas after the first)
    bytes32 internal asyncDefiInteractionHashes; // defi interaction hashes to be transferred into pending defi interaction hashes
    bytes32 internal defiInteractionHashes;

    /*----------------------------------------
      PUBLIC STATE VARIABLES
      ----------------------------------------*/
    /**
     * @dev rollupState storage slot contains the following data:
     *
     * | bit offset   | num bits    | description |
     * | 0             | 202           | rollup state hash |
     * | 202            | 32            | datasize: number of filled entries in note tree |
     * | 235            | 10            | asyncDefiInteractionHashes.length : number of entries in asyncDefiInteractionHashes array |
     * | 245            | 10            | defiInteractionHashes.length : number of entries in defiInteractionHashes array |
     * | 255            | 1             | reentrancyMutex used to guard against reentrancy attacks
     */
    bytes32 public rollupState;

    // bytes32 public stateHash; todo add back in and remove from rollupState

    IVerifier public verifier;

    uint256 public immutable escapeBlockLowerBound;
    uint256 public immutable escapeBlockUpperBound;

    // Array of supported ERC20 token address.
    address[] public supportedAssets;

    // Array of supported bridge contract addresses (similar to assetIds)
    address[] public supportedBridges;

    // Mapping from assetId to mapping of userAddress to public userBalance stored on this contract
    mapping(uint256 => mapping(address => uint256)) public userPendingDeposits;

    mapping(address => mapping(bytes32 => bool)) public depositProofApprovals;

    mapping(address => bool) public rollupProviders;

    address public override defiBridgeProxy;

    // we need a way to register ERC20 Gas Limits for withdrawals to a specific asset id
    mapping(uint256 => uint256) public assetGasLimit;

    // map defiInteractionNonce to PendingDefiBridgeInteraction
    mapping(uint256 => PendingDefiBridgeInteraction) public pendingDefiInteractions;

    /**
     * @dev Used by brige contracts to send RollupProcessor ETH during a bridge interaction
     */
    mapping(uint256 => uint256) public ethPayments;

    // We need to cap the amount of gas sent to the DeFi bridge contract for two reasons.
    // 1: To provide consistency to rollup providers around costs.
    // 2: To prevent griefing attacks where a bridge consumes all our gas.

    uint256 private constant DEFAULT_BRIDGE_GAS_LIMIT = 300000;

    uint256 private constant DEFAULT_ERC20_GAS_LIMIT = 55000;

    // we need a way to register ERC20 Gas Limits for withdrawals to a specific asset id
    mapping(uint256 => uint256) assetGasLimits;

    // we need a way to register Bridge Gas Limits for dynamic limits per DeFi protocol

    mapping(uint256 => uint256) bridgeGasLimits;

    /*----------------------------------------
      EVENTS
      ----------------------------------------*/
    event RollupProcessed(uint256 indexed rollupId);
    event DefiBridgeProcessed(
        uint256 indexed bridgeId,
        uint256 indexed nonce,
        uint256 totalInputValue,
        uint256 totalOutputValueA,
        uint256 totalOutputValueB,
        bool result
    );
    event AsyncDefiBridgeProcessed(
        uint256 indexed bridgeId,
        uint256 indexed nonce,
        uint256 totalInputValue,
        uint256 totalOutputValueA,
        uint256 totalOutputValueB,
        bool result
    );
    event Deposit(uint256 assetId, address depositorAddress, uint256 depositValue);
    event Withdraw(uint256 assetId, address withdrawAddress, uint256 withdrawValue);
    event WithdrawError(bytes errorReason);
    event AssetAdded(uint256 indexed assetId, address indexed assetAddress, uint256 assetGasLimit);
    event BridgeAdded(uint256 indexed bridgeAddressId, address indexed bridgeAddress, uint256 bridgeGasLimit);
    event RollupProviderUpdated(address indexed providerAddress, bool valid);
    event VerifierUpdated(address indexed verifierAddress);

    /*----------------------------------------
      STRUCTS
      ----------------------------------------*/
    /**
     * @dev Represents an asynchronous defi bridge interaction that has not been resolved
     * @param bridgeId the bridge id
     * @param totalInputValue number of tokens/wei sent to the bridge
     */
    struct PendingDefiBridgeInteraction {
        uint256 bridgeId;
        uint256 totalInputValue;
    }

    /**
     * @dev Container for the results of a DeFi interaction
     * @param outputValueA number of returned tokens for the interaction's first output asset
     * @param outputValueB number of returned tokens for the interaction's second output asset (if relevant)
     * @param isAsync is the interaction asynchronous? i.e. triggering an interaction does not immediately resolve
     * @param success did the call to the bridge succeed or fail?
     *
     * @notice async interactions must have outputValueA == 0 and outputValueB == 0 (tokens get returned later via calling `processAsyncDefiInteraction`)
     */
    struct BridgeResult {
        uint256 outputValueA;
        uint256 outputValueB;
        bool isAsync;
        bool success;
    }

    /*----------------------------------------
      FUNCTIONS
      ----------------------------------------*/
    function getStateHash() public view returns (bytes32 stateHash) {
        assembly {
            stateHash := and(STATE_HASH_MASK, sload(rollupState.slot))
        }
    }

    function getDataSize() public view returns (uint256 dataSize) {
        assembly {
            dataSize := and(DATASIZE_MASK, shr(DATASIZE_BIT_OFFSET, sload(rollupState.slot)))
        }
    }

    function setStateHash(bytes32 newStateHash) internal {
        assembly {
            let oldState := and(not(STATE_HASH_MASK), sload(rollupState.slot))
            let updatedState := or(oldState, and(newStateHash, STATE_HASH_MASK))
            sstore(rollupState.slot, updatedState)
        }
    }

    function setDataSize(uint256 newDataSize) internal {
        assembly {
            let oldState := and(not(shl(DATASIZE_BIT_OFFSET, DATASIZE_MASK)), sload(rollupState.slot))
            let updatedState := or(oldState, shl(DATASIZE_BIT_OFFSET, and(newDataSize, DATASIZE_MASK)))
            sstore(rollupState.slot, updatedState)
        }
    }

    function setReentrancyMutex() internal {
        assembly {
            let oldState := sload(rollupState.slot)
            let updatedState := or(shl(REENTRANCY_MUTEX_BIT_OFFSET, 1), oldState)
            sstore(rollupState.slot, updatedState)
        }
    }

    function getReentrancyMutex() internal view returns (bool mutexValue) {
        assembly {
            mutexValue := shr(REENTRANCY_MUTEX_BIT_OFFSET, sload(rollupState.slot))
        }
    }

    function clearReentrancyMutex() internal {
        assembly {
            let oldState := sload(rollupState.slot)
            let updatedState := and(not(shl(REENTRANCY_MUTEX_BIT_OFFSET, 1)), oldState)
            sstore(rollupState.slot, updatedState)
        }
    }

    function reentrancyMutexCheck() internal view {
        bool mutexValue;
        assembly {
            mutexValue := shr(REENTRANCY_MUTEX_BIT_OFFSET, sload(rollupState.slot))
        }
        if (mutexValue) {
            revert REENTRANCY_MUTEX_SET();
        }
    }

    function getDefiInteractionHashesLength() internal view returns (uint256 res) {
        assembly {
            res := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, sload(rollupState.slot)))
        }
    }

    function getAsyncDefiInteractionHashesLength() internal view returns (uint256 res) {
        assembly {
            res := and(ARRAY_LENGTH_MASK, shr(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, sload(rollupState.slot)))
        }
    }

    constructor(
        address _verifierAddress,
        uint256 _escapeBlockLowerBound,
        uint256 _escapeBlockUpperBound,
        address _defiBridgeProxy,
        address _contractOwner,
        bytes32 _initDataRoot,
        bytes32 _initNullRoot,
        bytes32 _initRootRoot,
        uint256 _initDataSize
    ) {
        rollupState = bytes32(
            uint256(
                keccak256(
                    abi.encodePacked(
                        uint256(0), // nextRollupId
                        _initDataRoot,
                        _initNullRoot,
                        _initRootRoot,
                        INIT_DEFI_ROOT
                    )
                )
            ) & STATE_HASH_MASK
        );
        setDataSize(_initDataSize);
        verifier = IVerifier(_verifierAddress);
        defiBridgeProxy = _defiBridgeProxy;
        escapeBlockLowerBound = _escapeBlockLowerBound;
        escapeBlockUpperBound = _escapeBlockUpperBound;
        rollupProviders[msg.sender] = true;
        transferOwnership(_contractOwner);
    }

    /**
     * @dev Allow the multisig owner to pause the contract, in case of bugs.
     */
    function pause() public override onlyOwner {
        _pause();
    }

    /**
     * @dev Used by bridge contracts to send RollupProcessor ETH during a bridge interaction
     * @param interactionNonce the Defi interaction nonce that this payment is logged against
     */
    function receiveEthFromBridge(uint256 interactionNonce) external payable {
        ethPayments[interactionNonce] = msg.value;
    }

    function setRollupProvider(address providerAddress, bool valid) public override onlyOwner {
        rollupProviders[providerAddress] = valid;
        emit RollupProviderUpdated(providerAddress, valid);
    }

    function setVerifier(address _verifierAddress) public override onlyOwner {
        verifier = IVerifier(_verifierAddress);
        emit VerifierUpdated(_verifierAddress);
    }

    function setDefiBridgeProxy(address defiBridgeProxyAddress) public override onlyOwner {
        defiBridgeProxy = defiBridgeProxyAddress;
    }

    /**
     * @dev Approve a proofHash for spending a users deposited funds, this is one way and must be called by the owner of the funds
     * @param _proofHash - keccack256 hash of the inner proof public inputs
     */
    function approveProof(bytes32 _proofHash) public override whenNotPaused {
        depositProofApprovals[msg.sender][_proofHash] = true;
    }

    /**
     * @dev Get the ERC20 token address of a supported asset, for a given assetId
     * @param assetId - identifier used to denote a particular asset
     */
    function getSupportedAsset(uint256 assetId) public view override returns (address) {
        // If the asset ID is >= 2^29, the asset represents a 'virtual' asset that has no ERC20 analogue
        // Virtual assets are used by defi bridges to track non-token data. E.g. to represent a loan.
        // If an assetId is *not* a virtual asset, its ERC20 address can be recovered from `supportedAssets[assetId]`
        if (assetId > 0x1fffffff) {
            revert INVALID_ASSET_ID();
        }

        // If assetId == ethAssetId (i.e. 0), this represents native ETH.
        // ERC20 token asset id values start at 1
        if (assetId == ethAssetId) {
            return address(0x0);
        }
        address result = supportedAssets[assetId - 1];
        if (result == address(0)) {
            revert INVALID_ASSET_ADDRESS();
        }
        return result;
    }

    /**
     * @dev throw if a given assetId represents a virtual asset
     * @param assetId 30-bit integer that describes the asset.
     * If assetId's 29th bit is set, it represents a virtual asset with no ERC20 equivalent
     * Virtual assets are used by defi bridges to track non-token data. E.g. to represent a loan.
     * If an assetId is *not* a virtual asset, its ERC20 address can be recovered from `supportedAssets[assetId]`
     */
    function validateAssetIdIsNotVirtual(uint256 assetId) internal pure {
        if (assetId > 0x1fffffff) {
            revert INVALID_ASSET_ID();
        }
    }

    /**
     * @dev Get the bridge contract address for a given bridgeAddressId
     * @param bridgeAddressId - identifier used to denote a particular bridge
     */
    function getSupportedBridge(uint256 bridgeAddressId) public view override returns (address) {
        return supportedBridges[bridgeAddressId - 1];
    }

    /**
     * @dev Get the gas limit for the bridge specified by bridgeAddressId
     * @param bridgeAddressId - identifier used to denote a particular bridge
     */
    function getBridgeGasLimit(uint256 bridgeAddressId) public view override returns (uint256) {
        return DEFAULT_BRIDGE_GAS_LIMIT;
    }

    /**
     * @dev Get the addresses of all supported bridge contracts
     */
    function getSupportedBridges() external view override returns (address[] memory) {
        return supportedBridges;
    }

    /**
     * @dev Get the addresses of all supported ERC20 tokens
     */
    function getSupportedAssets() external view override returns (address[] memory) {
        return supportedAssets;
    }

    function getDefiInteractionHashes() external view returns (bytes32[] memory res) {
        uint256 len = getDefiInteractionHashesLength();
        assembly {
            mstore(0x00, defiInteractionHashes.slot)
            let slot := keccak256(0x00, 0x20)
            res := mload(0x40)
            mstore(0x40, add(res, add(0x20, mul(len, 0x20))))
            mstore(res, len)
            let ptr := add(res, 0x20)
            for {
                let i := 0
            } lt(i, len) {
                i := add(i, 0x01)
            } {
                mstore(ptr, sload(add(slot, i)))
                ptr := add(ptr, 0x20)
            }
        }
        return res;
    }

    function getAsyncDefiInteractionHashes() external view returns (bytes32[] memory res) {
        uint256 len = getAsyncDefiInteractionHashesLength();
        assembly {
            mstore(0x00, asyncDefiInteractionHashes.slot)
            let slot := keccak256(0x00, 0x20)
            res := mload(0x40)
            mstore(0x40, add(res, add(0x20, mul(len, 0x20))))
            mstore(res, len)
            let ptr := add(res, 0x20)
            for {
                let i := 0
            } lt(i, len) {
                i := add(i, 0x01)
            } {
                mstore(ptr, sload(add(slot, i)))
                ptr := add(ptr, 0x20)
            }
        }
        return res;
    }

    /**
     * @dev Get the status of whether an asset supports the permit ERC-2612 approval flow
     * @param assetId - unique identifier of the supported asset
     */
    function getAssetPermitSupport(uint256 assetId) public view override returns (bool) {
        address assetAddress = getSupportedAsset(assetId);
        return assetPermitSupport[assetAddress];
    }

    /**
     * @dev Get the status of the escape hatch, specifically retrieve whether the
     * hatch is open and also the number of blocks until the hatch will switch from
     * open to closed or vice versa
     */
    function getEscapeHatchStatus() public view override returns (bool, uint256) {
        uint256 blockNum = block.number;

        bool isOpen = blockNum % escapeBlockUpperBound >= escapeBlockLowerBound;
        uint256 blocksRemaining = 0;
        if (isOpen) {
            // num blocks escape hatch will remain open for
            blocksRemaining = escapeBlockUpperBound - (blockNum % escapeBlockUpperBound);
        } else {
            // num blocks until escape hatch will be opened
            blocksRemaining = escapeBlockLowerBound - (blockNum % escapeBlockUpperBound);
        }
        return (isOpen, blocksRemaining);
    }

    /**
     * @dev Get the balance of a user, for a particular asset, held on the user's behalf
     * by this contract
     * @param assetId - unique identifier of the asset
     * @param userAddress - Ethereum address of the user who's balance is being queried
     */
    function getUserPendingDeposit(uint256 assetId, address userAddress) external view override returns (uint256) {
        return userPendingDeposits[assetId][userAddress];
    }

    /**
     * @dev Increase the userPendingDeposits mapping
     */
    function increasePendingDepositBalance(
        uint256 assetId,
        address depositorAddress,
        uint256 amount
    ) internal {
        validateAssetIdIsNotVirtual(assetId);
        userPendingDeposits[assetId][depositorAddress] = userPendingDeposits[assetId][depositorAddress].add(amount);
    }

    /**
     * @dev Decrease the userPendingDeposits mapping
     */
    function decreasePendingDepositBalance(
        uint256 assetId,
        address transferFromAddress,
        uint256 amount
    ) internal {
        validateAssetIdIsNotVirtual(assetId);
        uint256 userBalance = userPendingDeposits[assetId][transferFromAddress];
        if (userBalance < amount) {
            revert INSUFFICIENT_DEPOSIT();
        }

        userPendingDeposits[assetId][transferFromAddress] = userBalance.sub(amount);
    }

    /**
     * @dev Set the mapping between an assetId and the address of the linked asset.
     * Protected by onlyOwner
     * @param linkedToken - address of the asset
     * @param supportsPermit - bool determining whether this supports permit
     * @param gasLimit - uint256 gas limit for ERC20 token transfers of this asset
     */

    function setSupportedAsset(
        address linkedToken,
        bool supportsPermit,
        uint256 gasLimit
    ) external override {
        if (linkedToken == address(0)) {
            revert INVALID_LINKED_TOKEN_ADDRESS();
        }

        supportedAssets.push(linkedToken);
        assetPermitSupport[linkedToken] = supportsPermit;

        uint256 assetId = supportedAssets.length;
        assetGasLimits[assetId] = gasLimit == 0 ? DEFAULT_ERC20_GAS_LIMIT : gasLimit;

        emit AssetAdded(assetId, linkedToken, assetGasLimits[assetId]);
    }

    /**
     * @dev Set the mapping between an bridge contract id and the address of the linked bridge contract.
     * Protected by onlyOwner
     * @param linkedBridge - address of the bridge contract
     * @param gasLimit - uint256 gas limit to send to the bridge convert function
     */
    function setSupportedBridge(address linkedBridge, uint256 gasLimit) external override onlyOwner {
        if (linkedBridge == address(0)) {
            revert INVALID_LINKED_BRIDGE_ADDRESS();
        }
        supportedBridges.push(linkedBridge);

        uint256 bridgeAddressId = supportedBridges.length;
        bridgeGasLimits[bridgeAddressId] = gasLimit == 0 ? DEFAULT_BRIDGE_GAS_LIMIT : gasLimit;

        emit BridgeAdded(bridgeAddressId, linkedBridge, bridgeGasLimits[bridgeAddressId]);
    }

    /**
     * @dev Update the value indicating whether a linked asset supports permit.
     * Protected by onlyOwner
     * @param assetId - unique ID of the asset
     * @param supportsPermit - bool determining whether this supports permit
     */
    function setAssetPermitSupport(uint256 assetId, bool supportsPermit) external override onlyOwner {
        address assetAddress = getSupportedAsset(assetId);
        if (assetAddress == address(0)) {
            revert TOKEN_ASSET_IS_NOT_LINKED();
        }

        assetPermitSupport[assetAddress] = supportsPermit;
    }

    /**
     * @dev Deposit funds as part of the first stage of the two stage deposit. Non-permit flow
     * @param assetId - unique ID of the asset
     * @param amount - number of tokens being deposited
     * @param depositorAddress - address from which funds are being transferred to the contract
     * @param proofHash - the 32 byte transaction id that can spend the deposited funds
     */
    function depositPendingFunds(
        uint256 assetId,
        uint256 amount,
        address depositorAddress,
        bytes32 proofHash
    ) external payable override whenNotPaused {
        // Guard against defi bridges calling `depositPendingFunds` when processRollup calls their `convert` function
        reentrancyMutexCheck();

        if (assetId == ethAssetId) {
            if (msg.value != amount) {
                revert MSG_VALUE_WRONG_AMOUNT();
            }
            increasePendingDepositBalance(assetId, depositorAddress, amount);
        } else {
            if (msg.value != 0) {
                revert DEPOSIT_TOKENS_WRONG_PAYMENT_TYPE();
            }

            address assetAddress = getSupportedAsset(assetId);
            internalDeposit(assetId, assetAddress, depositorAddress, amount);
        }

        if (proofHash != 0) {
            approveProof(proofHash);
        }
    }

    /**
     * @dev Deposit funds as part of the first stage of the two stage deposit. Permit flow
     * @param assetId - unique ID of the asset
     * @param amount - number of tokens being deposited
     * @param depositorAddress - address from which funds are being transferred to the contract
     * @param proofHash - the 32 byte transaction id that can spend the deposited funds
     * @param spender - address being granted approval to spend the funds
     * @param permitApprovalAmount - amount permit signature is approving
     * @param deadline - when the permit signature expires
     * @param v - ECDSA sig param
     * @param r - ECDSA sig param
     * @param s - ECDSA sig param
     */
    function depositPendingFundsPermit(
        uint256 assetId,
        uint256 amount,
        address depositorAddress,
        bytes32 proofHash,
        address spender,
        uint256 permitApprovalAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override whenNotPaused {
        reentrancyMutexCheck();
        address assetAddress = getSupportedAsset(assetId);
        IERC20Permit(assetAddress).permit(depositorAddress, spender, permitApprovalAmount, deadline, v, r, s);
        internalDeposit(assetId, assetAddress, depositorAddress, amount);

        if (proofHash != '') {
            approveProof(proofHash);
        }
    }

    /**
     * @dev Deposit funds as part of the first stage of the two stage deposit. Non-permit flow
     * @param assetId - unique ID of the asset
     * @param assetAddress - address of the ERC20 asset
     * @param depositorAddress - address from which funds are being transferred to the contract
     * @param amount - amount being deposited
     */
    function internalDeposit(
        uint256 assetId,
        address assetAddress,
        address depositorAddress,
        uint256 amount
    ) internal {
        validateAssetIdIsNotVirtual(assetId);
        // check user approved contract to transfer funds, so can throw helpful error to user
        uint256 rollupAllowance = IERC20(assetAddress).allowance(depositorAddress, address(this));
        if (rollupAllowance < amount) {
            revert INSUFFICIENT_TOKEN_APPROVAL();
        }

        TokenTransfers.safeTransferFrom(assetAddress, depositorAddress, address(this), amount);
        increasePendingDepositBalance(assetId, depositorAddress, amount);

        emit Deposit(assetId, depositorAddress, amount);
    }

    /**
     * @dev Process a rollup - decode the rollup, update relevant state variables and
     * verify the proof
     * @param - cryptographic proof data associated with a rollup
     * @param signatures - bytes array of secp256k1 ECDSA signatures, authorising a transfer of tokens
     * from the publicOwner for the particular inner proof in question. There is a signature for each
     * inner proof.
     *
     * Structure of each signature in the bytes array is:
     * 0x00 - 0x20 : r
     * 0x20 - 0x40 : s
     * 0x40 - 0x60 : v (in form: 0x0000....0001b for example)
     *
     * @param - offchainTxData Note: not used in the logic
     * of the rollupProcessor contract, but called here as a convenient to place data on chain
     */

    function processRollup(
        bytes calldata, /* encodedProofData */
        bytes calldata signatures,
        bytes calldata /* offchainTxData */
    ) external override whenNotPaused {
        reentrancyMutexCheck();
        setReentrancyMutex();
        // 1. Process a rollup if the escape hatch is open or,
        // 2. There msg.sender is an authorised rollup provider
        // 3. Always transfer fees to the passed in feeReceiver
        (bool isOpen, ) = getEscapeHatchStatus();
        if (!(rollupProviders[msg.sender] || isOpen)) {
            revert INVALID_PROVIDER();
        }

        (bytes memory proofData, uint256 numTxs, uint256 publicInputsHash) = decodeProof();

        processRollupProof(proofData, signatures, numTxs, publicInputsHash);

        transferFee(proofData, extractRollupBeneficiaryAddress(proofData));

        clearReentrancyMutex();
    }

    function processRollupProof(
        bytes memory proofData,
        bytes memory signatures,
        uint256 numTxs,
        uint256 publicInputsHash
    ) internal {
        verifyProofAndUpdateState(proofData, publicInputsHash);
        processDepositsAndWithdrawals(proofData, numTxs, signatures);
        processDefiBridges(proofData);
    }

    /**
     * @dev Verify the zk proof and update the contract state variables with those provided by the rollup.
     * @param proofData - cryptographic zk proof data. Passed to the verifier for verification.
     */
    function verifyProofAndUpdateState(bytes memory proofData, uint256 publicInputsHash) internal {
        // Verify the rollup proof.
        //
        // We manually call the verifier contract via assembly. This is to prevent a
        // redundant copy of `proofData` into memory, which costs between 100,000 to 1,000,000 gas
        // depending on the rollup size!
        bool proof_verified = false;
        uint256 broadcastedDataSize = rollupHeaderInputLength + 8; // add 8 bytes to skip over the two packed params that follow the rollup header data
        uint256 rollupHeaderInputLengthLocal = rollupHeaderInputLength;
        assembly {
            /**
             * Validate correctness of zk proof.
             *
             * 1st Item is to format verifier calldata.
             **/

            // Our first input param `encodedProofData` contains the concatenation of
            // encoded 'broadcasted inputs' and the actual zk proof data.
            // (The `boadcasted inputs` is converted into a 32-byte SHA256 hash, which is
            // validated to equal the first public inputs of the zk proof. This is done in `Decoder.sol`).
            // We need to identify the location in calldata that points to the start of the zk proof data.

            // Step 1: compute size of zk proof data and its calldata pointer.
            /**
                Data layout for `bytes encodedProofData`...

                0x00 : 0x20 : length of array
                0x20 : 0x20 + header : root rollup header data
                0x20 + header : 0x24 + header : X, the length of encoded inner join-split public inputs
                0x24 + header : 0x24 + header + X : (inner join-split public inputs)
                0x24 + header + X : 0x28 + header + X : Y, the length of the zk proof data
                0x28 + header + X : 0x28 + haeder + X + Y : zk proof data

                We need to recover the numeric value of `0x28 + header + X` and `Y`
             **/
            // Begin by getting length of encoded inner join-split public inputs.
            // `calldataload(0x04)` points to start of bytes array. Add 0x24 to skip over length param and function signature.
            // The calldata param 4 bytes *after* the header is the length of the pub inputs array. However it is a packed 4-byte param.
            // To extract it, we subtract 24 bytes from the calldata pointer and mask off all but the 4 least significant bytes.
            let encodedInnerDataSize := and(
                calldataload(add(add(calldataload(0x04), 0x24), sub(rollupHeaderInputLengthLocal, 0x18))),
                0xffffffff
            )

            // broadcastedDataSize = inner join-split pubinput size + header size + 4 bytes (skip over zk proof length param)
            broadcastedDataSize := add(broadcastedDataSize, encodedInnerDataSize)

            // Compute zk proof data size by subtracting broadcastedDataSize from overall length of bytes encodedProofsData
            let zkProofDataSize := sub(calldataload(add(calldataload(0x04), 0x04)), broadcastedDataSize)

            // Compute calldata pointer to start of zk proof data by adding calldata offset to broadcastedDataSize
            // (+0x24 skips over function signature and length param of bytes encodedProofData)
            let zkProofDataPtr := add(broadcastedDataSize, add(calldataload(0x04), 0x24))

            // Step 2: Format calldata for verifier contract call.

            // Get free memory pointer - we copy calldata into memory starting here
            let dataPtr := mload(0x40)

            // We call the function `verify(bytes,uint256)`
            // The function signature is 0xac318c5d
            // Calldata map is:
            // 0x00 - 0x04 : 0xac318c5d
            // 0x04 - 0x24 : 0x40 (number of bytes between 0x04 and the start of the `proofData` array at 0x44)
            // 0x24 - 0x44 : publicInputsHash
            // 0x44 - .... : proofData
            mstore8(dataPtr, 0xac)
            mstore8(add(dataPtr, 0x01), 0x31)
            mstore8(add(dataPtr, 0x02), 0x8c)
            mstore8(add(dataPtr, 0x03), 0x5d)
            mstore(add(dataPtr, 0x04), 0x40)
            mstore(add(dataPtr, 0x24), publicInputsHash)
            mstore(add(dataPtr, 0x44), zkProofDataSize) // length of zkProofData bytes array
            calldatacopy(add(dataPtr, 0x64), zkProofDataPtr, zkProofDataSize) // copy the zk proof data into memory

            // Step 3: Call our verifier contract. If does not return any values, but will throw an error if the proof is not valid
            // i.e. verified == false if proof is not valid
            proof_verified := staticcall(gas(), sload(verifier.slot), dataPtr, add(zkProofDataSize, 0x64), 0x00, 0x00)
        }

        // Check the proof is valid!
        if (!proof_verified) {
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }

        // Validate and update state hash
        uint256 rollupId = validateAndUpdateMerkleRoots(proofData);

        emit RollupProcessed(rollupId);
    }

    /**
     * @dev Extract public inputs and validate they are inline with current contract state.
     * @param proofData - Rollup proof data.
     */
    function validateAndUpdateMerkleRoots(bytes memory proofData) internal returns (uint256) {
        (
            uint256 rollupId,
            bytes32 oldStateHash,
            bytes32 newStateHash,
            uint256 numDataLeaves,
            uint256 dataStartIndex
        ) = computeRootHashes(proofData);

        bytes32 expectedStateHash = getStateHash();
        if (oldStateHash != expectedStateHash) {
            revert INCORRECT_STATE_HASH(oldStateHash, newStateHash);
        }

        uint256 storedDataSize = getDataSize();
        // Ensure we are inserting at the next subtree boundary.
        if (storedDataSize % numDataLeaves == 0) {
            if (dataStartIndex != storedDataSize) {
                revert INCORRECT_DATA_START_INDEX(dataStartIndex, storedDataSize);
            }
        } else {
            uint256 expected = storedDataSize + numDataLeaves - (storedDataSize % numDataLeaves);
            if (dataStartIndex != expected) {
                revert INCORRECT_DATA_START_INDEX(dataStartIndex, expected);
            }
        }

        setStateHash(newStateHash);
        setDataSize(dataStartIndex + numDataLeaves);
        return rollupId;
    }

    /**
     * @dev Process deposits and withdrawls.
     * @param proofData - the proof data
     * @param numTxs - number of transactions rolled up in the proof
     * @param signatures - bytes array of secp256k1 ECDSA signatures, authorising a transfer of tokens
     */
    function processDepositsAndWithdrawals(
        bytes memory proofData,
        uint256 numTxs,
        bytes memory signatures
    ) internal {
        uint256 sigIndex = 0x00;
        uint256 proofDataPtr;
        assembly {
            proofDataPtr := add(proofData, 0x20) // add 0x20 to skip over 1st field in bytes array (the length field)
        }
        proofDataPtr += rollupHeaderInputLength; // update pointer to skip over rollup public inputs and point to inner tx public inputs
        uint256 end = proofDataPtr + (numTxs * txPubInputLength);
        uint256 stepSize = txPubInputLength;

        // This is a bit of a hot loop, we iterate over every tx to determine whether to process deposits or withdrawals.
        while (proofDataPtr < end) {
            // extract the minimum information we need to determine whether to skip this iteration
            uint256 publicValue;
            assembly {
                publicValue := mload(add(proofDataPtr, 0xa0))
            }
            if (publicValue > 0) {
                uint256 proofId;
                uint256 assetId;
                address publicOwner;
                assembly {
                    proofId := mload(proofDataPtr)
                    assetId := mload(add(proofDataPtr, 0xe0))
                    publicOwner := mload(add(proofDataPtr, 0xc0))
                }

                if (proofId == 1) {
                    // validate user has approved deposit
                    bytes32 digest;
                    assembly {
                        // compute the tx id to check if user has approved tx
                        digest := keccak256(proofDataPtr, stepSize)
                    }
                    // check if there is an existing entry in depositProofApprovals
                    // if there is, no further work required.
                    // we don't need to clear `depositProofApprovals[publicOwner][digest]` because proofs cannot be re-used.
                    // A single proof describes the creation of 2 output notes and the addition of 2 input note nullifiers
                    // (both of these nullifiers can be categorised as "fake". They may not map to existing notes but are still inserted in the nullifier set)
                    // Replaying the proof will fail to satisfy the rollup circuit's non-membership check on the input nullifiers.
                    // We avoid resetting `depositProofApprovals` because that would cost additional gas post-London hard fork.
                    if (!depositProofApprovals[publicOwner][digest]) {
                        // extract and validate signature
                        // we can create a bytes memory container for the signature without allocating new memory,
                        // by overwriting the previous 32 bytes in the `signatures` array with the 'length' of our synthetic byte array (92)
                        // we store the memory we overwrite in `temp`, so that we can restore it
                        bytes memory signature;
                        uint256 temp;
                        assembly {
                            // set `signature` to point to 32 bytes less than the desired `r, s, v` values in `signatures`
                            signature := add(signatures, sigIndex)
                            // cache the memory we're about to overwrite
                            temp := mload(signature)
                            // write in a 92-byte 'length' parameter into the `signature` bytes array
                            mstore(signature, 0x60)
                        }

                        bytes32 hashedMessage;
                        assembly {
                            let mPtr := mload(0x40)
                            mstore(add(mPtr, 32), '\x19Ethereum Signed Message:\n174')
                            mstore(add(mPtr, 61), 'Signing this message will allow ')
                            mstore(add(mPtr, 93), 'your pending funds to be spent i')
                            mstore(add(mPtr, 125), 'n Aztec transaction:\n')
                            mstore(add(mPtr, 146), digest)
                            mstore(add(mPtr, 178), '\nIMPORTANT: Only sign the messag')
                            mstore(add(mPtr, 210), 'e if you trust the client')
                            hashedMessage := keccak256(add(mPtr, 32), 203)
                        }

                        RollupProcessorLibrary.validateSheildSignatureUnpacked(hashedMessage, signature, publicOwner);
                        // restore the memory we overwrote
                        assembly {
                            mstore(signature, temp)
                            sigIndex := add(sigIndex, 0x60)
                        }
                    }
                    decreasePendingDepositBalance(assetId, publicOwner, publicValue);
                }

                if (proofId == 2) {
                    withdraw(publicValue, publicOwner, assetId);
                }
            }
            proofDataPtr += txPubInputLength;
        }
    }

    /**
     * @dev Contains information that describes a specific DeFi bridge
     * @notice A single smart contract can be used to represent multiple bridges
     *
     * @param bridgeAddressId the bridge contract address = supportedBridges[bridgeAddressId]
     * @param bridgeAddress   the bridge contract address
     * @param inputAssetId
     */
    struct BridgeData {
        uint256 bridgeAddressId;
        address bridgeAddress;
        uint256 inputAssetId;
        uint256 outputAssetIdA;
        uint256 outputAssetIdB;
        uint256 linkedInteractionNonce;
        uint256 auxData;
        bool secondOutputVirtual;
        bool secondOutputReal;
        bool firstOutputVirtual;
        bool secondInputVirtual;
        uint256 bridgeGasLimit;
    }

    /**
     * @dev Unpack the bridgeId into a BridgeData struct
     * @param bridgeId - Bit-array that encodes data that describes a DeFi bridge.
     *
     * Structure of the bit array is as follows (starting at least significant bit):
     * | bit range | parameter | description
     * | 0 - 32    | bridgeAddressId | The address ID. Bridge address = `supportedBridges[bridgeAddressId]`
     * | 32 - 62   | inputAssetId    | Input asset ID. Asset address = `supportedAssets[inputAssetId]`
     * | 62 - 92   | outputAssetIdA  | First output asset ID |
     * | 92 - 122  | outputAssetIdB  | Second output asset ID (if bridge has 2nd output asset) |
     * | 122 - 154 | linkedInteractionNonce | defi interaction nonce of interaction that produced the input notes. Only relevant for virtual input assets |
     * | 154 - 186 | bitConfig | Bit-array that contains boolean bridge settings |
     * | 186 - 250 | auxData | 64 bits of custom data to be passed to the bridge contract. Structure is defined/checked by the bridge contract |
     *
     * Structure of the `bigConfig` parameter is as follows
     * | bit | parameter | description |
     * | 0   | firstInputAssetVirtual  | is the first input asset virtual? Currently always false, support planned for future update |
     * | 1   | secondInputAssetVirtual | is the second input asset virtual? Virtual assets have no ERC20 token analogue |
     * | 2   | firstOutputAssetVirtual | is the first output asset virtual? Currently always false, support planned for future update |
     * | 3   | secondOutputAssetVirtual| is the second output asset virtual?
     * | 4   | secondInputReal         | does the second input note represent a non-virtual, real ERC20 token? Currently always false, support planned for future update |
     * | 5   | secondOutputReal        | does the second output note represent a non-virtual, real ERC20 token? |
     *
     * Brief note on virtual assets: Virtual assets are assets that don't have an ERC20 token analogue and exist solely as notes within the Aztec network.
     * They can be created/spent as a result of DeFi interactions. They are used to enable defi bridges to track internally-defined data without having to
     * mint a new token on-chain.
     * An example use of a virtual asset would a virtual loan asset that tracks an outstanding debt that must be repaid to recover collateral deposited into the bridge.
     *
     * @return bridgeData - struct that contains bridgeId data in a human-readable form.
     */
    function getBridgeData(uint256 bridgeId) internal view returns (BridgeData memory bridgeData) {
        bridgeData.bridgeAddressId = bridgeId & MASK_THIRTY_TWO_BITS;
        bridgeData.inputAssetId = (bridgeId >> INPUT_ASSET_ID_SHIFT) & MASK_THIRTY_BITS;
        bridgeData.outputAssetIdA = (bridgeId >> OUTPUT_ASSET_ID_A_SHIFT) & MASK_THIRTY_BITS;
        bridgeData.outputAssetIdB = (bridgeId >> OUTPUT_ASSET_ID_B_SHIFT) & MASK_THIRTY_BITS;
        bridgeData.linkedInteractionNonce = (bridgeId >> LINKED_INTERACTION_NONCE_SHIFT) & MASK_THIRTY_TWO_BITS;
        bridgeData.auxData = (bridgeId >> AUX_DATA_SHIFT) & MASK_SIXTY_FOUR_BITS;

        uint256 bitConfig = (bridgeId >> BITCONFIG_SHIFT) & MASK_THIRTY_TWO_BITS;
        // bitConfig = bit mask that contains bridge ID settings
        // bit 0 = first input asset virtual? (always zero atm, ruled out by circuit constraints)
        // bit 1 = second input asset virtual?
        // bit 2 = first output asset virtual? (always zero atm, ruled out by circuit constraints)
        // bit 3 = second output asset virtual?
        // bit 4 = second input asset real? (always zero atm, ruled out by circuit constraints)
        // bit 5 = second output asset real?
        bridgeData.secondInputVirtual = ((bitConfig >> 1) & 1) == 1;
        bridgeData.secondOutputVirtual = ((bitConfig >> 3) & 1) == 1;
        bridgeData.secondOutputReal = ((bitConfig >> 5) & 1) == 1;

        bridgeData.bridgeAddress = supportedBridges[bridgeData.bridgeAddressId - 1];
        if (bridgeData.secondOutputReal) {
            if (bridgeData.outputAssetIdA == bridgeData.outputAssetIdB) {
                revert BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS(bridgeData.outputAssetIdA);
            }
        }
        bridgeData.bridgeGasLimit = bridgeGasLimits[bridgeData.bridgeAddressId];
    }

    /**
     * @dev Get the four input/output assets associated with a DeFi bridge
     * @param bridgeData - Information about the DeFi bridge
     * @param defiInteractionNonce - The defi interaction nonce
     *
     * @return inputAssetA inputAssetB outputAssetA outputAssetB : input and output assets represented as AztecAsset structs
     */
    function getAztecAssetTypes(BridgeData memory bridgeData, uint256 defiInteractionNonce)
        internal
        view
        returns (
            AztecTypes.AztecAsset memory inputAssetA,
            AztecTypes.AztecAsset memory inputAssetB,
            AztecTypes.AztecAsset memory outputAssetA,
            AztecTypes.AztecAsset memory outputAssetB
        )
    {
        inputAssetA.id = bridgeData.inputAssetId;
        inputAssetA.erc20Address = getSupportedAsset(bridgeData.inputAssetId);
        inputAssetA.assetType = inputAssetA.erc20Address == address(0x0)
            ? AztecTypes.AztecAssetType.ETH
            : AztecTypes.AztecAssetType.ERC20;
        outputAssetA.id = bridgeData.outputAssetIdA;
        outputAssetA.erc20Address = getSupportedAsset(bridgeData.outputAssetIdA);
        outputAssetA.assetType = outputAssetA.erc20Address == address(0x0)
            ? AztecTypes.AztecAssetType.ETH
            : AztecTypes.AztecAssetType.ERC20;

        // potential conflicting states that are explicitly ruled out by circuit constraints:
        // secondOutputVirtual && secondOutputReal
        // secondOutputVirtual && bridgeData.outputassetIdB != 0
        // if secondAssetValid is 1, both output asset ids cannot match one another
        // TODO: add all of them here!
        if (bridgeData.secondInputVirtual) {
            // use nonce as asset id.
            inputAssetB.id = bridgeData.linkedInteractionNonce;
            inputAssetB.erc20Address = address(0x0);
            inputAssetB.assetType = AztecTypes.AztecAssetType.VIRTUAL;
        } else {
            inputAssetB.id = 0;
            inputAssetB.erc20Address = address(0x0);
            inputAssetB.assetType = AztecTypes.AztecAssetType.NOT_USED;
        }

        if (bridgeData.secondOutputVirtual) {
            // use nonce as asset id.
            outputAssetB.id = defiInteractionNonce;
            outputAssetB.erc20Address = address(0x0);
            outputAssetB.assetType = AztecTypes.AztecAssetType.VIRTUAL;
        } else if (bridgeData.secondOutputReal) {
            outputAssetB.id = bridgeData.outputAssetIdB;
            outputAssetB.erc20Address = getSupportedAsset(bridgeData.outputAssetIdB);
            outputAssetB.assetType = outputAssetB.erc20Address == address(0x0)
                ? AztecTypes.AztecAssetType.ETH
                : AztecTypes.AztecAssetType.ERC20;
        } else {
            outputAssetB.id = 0;
            outputAssetB.erc20Address = address(0x0);
            outputAssetB.assetType = AztecTypes.AztecAssetType.NOT_USED;
        }
    }

    /**
     * @dev Process defi interactions.
     *      1. pop 4 (if available) interaction hashes off of `defiInteractionHashes`,
     *         validate their hash equals `numPendingInteractions`
     *         (this validates that rollup block has added these interaction results into the L2 data tree)
     *      2. iterate over rollup block's new defi interactions (up to 4). Trigger interactions by
     *         calling DefiBridgeProxy contract. Record results in either `defiInteractionHashes` (for synchrohnous txns)
     *         or, for async txns, the `pendingDefiInteractions` mapping
     *      3. copy the contents of `asyncInteractionHashes` into `defiInteractionHashes` && clear `asyncInteractionHashes`
     * @param proofData - the proof data
     */
    function processDefiBridges(bytes memory proofData) internal {
        // Pop off `numberOfBridgeCalls` number of defi interactions from defiInteractionHashes && SHA2 them.
        {
            bytes32 expectedDefiInteractionHash;
            assembly {
                // Compute the offset we use to index `defiInteractionHashes[]`
                // If defiInteractionHashes.length > numberOfBridgeCalls, offset = defiInteractionhashes.length - numberOfBridgeCalls.
                // Else offset = 0
                let numPendingInteractions
                let offset
                let state := sload(rollupState.slot)
                {
                    let defiInteractionHashesLength := and(
                        ARRAY_LENGTH_MASK,
                        shr(DEFIINTERACTIONHASHES_BIT_OFFSET, state)
                    )
                    numPendingInteractions := defiInteractionHashesLength
                    if gt(numPendingInteractions, numberOfBridgeCalls) {
                        numPendingInteractions := numberOfBridgeCalls
                    }
                    offset := sub(defiInteractionHashesLength, numPendingInteractions)
                }

                mstore(0x00, defiInteractionHashes.slot)
                let sloadOffset := keccak256(0x00, 0x20)
                let mPtr := mload(0x40)
                let i := 0

                // Iterate over numPendingInteractions (will be between 0 and numberOfBridgeCalls)
                // Load defiInteractionHashes[offset + i] and store in memory
                // in order to compute SHA2 hash (expectedDefiInteractionHash)
                for {

                } lt(i, numPendingInteractions) {
                    i := add(i, 0x01)
                } {
                    mstore(add(mPtr, mul(i, 0x20)), sload(add(sloadOffset, add(offset, i))))
                }

                // If numPendingInteractions < numberOfBridgeCalls, continue iterating up to numberOfBridgeCalls, this time
                // inserting the "zero hash", the result of sha256(emptyDefiInteractionResult)
                for {

                } lt(i, numberOfBridgeCalls) {
                    i := add(i, 0x01)
                } {
                    mstore(add(mPtr, mul(i, 0x20)), 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4)
                }
                pop(staticcall(gas(), 0x2, mPtr, mul(0x20, numberOfBridgeCalls), 0x00, 0x20))
                expectedDefiInteractionHash := mod(mload(0x00), CIRCUIT_MODULUS)

                // Update DefiInteractionHashes.length (we've reduced length by up to numberOfBridgeCalls)
                let oldState := and(not(shl(DEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)
                let newState := or(oldState, shl(DEFIINTERACTIONHASHES_BIT_OFFSET, offset))
                sstore(rollupState.slot, newState)
            }

            bytes32 prevDefiInteractionHash = extractPrevDefiInteractionHash(proofData);

            // Validate the compupted interactionHash matches the value in the rollup proof!
            if (prevDefiInteractionHash != expectedDefiInteractionHash) {
                revert INCORRECT_PREVIOUS_DEFI_INTERACTION_HASH(prevDefiInteractionHash, expectedDefiInteractionHash);
            }
        }

        uint256 interactionNonce = getRollupId(proofData) * numberOfBridgeCalls;

        // ### Process DefiBridge Calls
        uint256 proofDataPtr;
        uint256 defiInteractionHashesLength;
        assembly {
            proofDataPtr := add(proofData, bridgeIdsOffset)
            defiInteractionHashesLength := and(
                ARRAY_LENGTH_MASK,
                shr(DEFIINTERACTIONHASHES_BIT_OFFSET, sload(rollupState.slot))
            )
        }
        BridgeResult memory bridgeResult;
        assembly {
            bridgeResult := mload(0x40)
            mstore(0x40, add(bridgeResult, 0x80))
        }
        for (uint256 i = 0; i < numberOfBridgeCalls; ++i) {
            uint256 bridgeId;
            assembly {
                bridgeId := mload(proofDataPtr)
            }
            if (bridgeId == 0) {
                // no more bridges to call
                break;
            }
            uint256 totalInputValue;
            assembly {
                totalInputValue := mload(add(proofDataPtr, mul(0x20, numberOfBridgeCalls)))
            }
            if (totalInputValue == 0) {
                revert ZERO_TOTAL_INPUT_VALUE();
            }

            BridgeData memory bridgeData = getBridgeData(bridgeId);

            (
                AztecTypes.AztecAsset memory inputAssetA,
                AztecTypes.AztecAsset memory inputAssetB,
                AztecTypes.AztecAsset memory outputAssetA,
                AztecTypes.AztecAsset memory outputAssetB
            ) = getAztecAssetTypes(bridgeData, interactionNonce);

            assembly {
                // call the following function of DefiBridgeProxy via delegatecall...
                //     function convert(
                //          address bridgeAddress,
                //          AztecTypes.AztecAsset calldata inputAssetA,
                //          AztecTypes.AztecAsset calldata inputAssetB,
                //          AztecTypes.AztecAsset calldata outputAssetA,
                //          AztecTypes.AztecAsset calldata outputAssetB,
                //          uint256 totalInputValue,
                //          uint256 interactionNonce,
                //          uint256 auxInputData,
                //          uint256 ethPaymentsSlot
                //     )

                // Construct the calldata we send to DefiBridgeProxy
                // mPtr = memory pointer. Set to free memory location (0x40)
                let mPtr := mload(0x40)
                // first 4 bytes is the function signature
                mstore(mPtr, DEFI_BRIDGE_PROXY_CONVERT_SELECTOR)
                mPtr := add(mPtr, 0x04)
                {
                    let bridgeAddress := mload(add(bridgeData, 0x20))
                    mstore(mPtr, bridgeAddress)
                }

                mstore(add(mPtr, 0x20), mload(inputAssetA))
                mstore(add(mPtr, 0x40), mload(add(inputAssetA, 0x20)))
                mstore(add(mPtr, 0x60), mload(add(inputAssetA, 0x40)))
                mstore(add(mPtr, 0x80), mload(inputAssetB))
                mstore(add(mPtr, 0xa0), mload(add(inputAssetB, 0x20)))
                mstore(add(mPtr, 0xc0), mload(add(inputAssetB, 0x40)))
                mstore(add(mPtr, 0xe0), mload(outputAssetA))
                mstore(add(mPtr, 0x100), mload(add(outputAssetA, 0x20)))
                mstore(add(mPtr, 0x120), mload(add(outputAssetA, 0x40)))
                mstore(add(mPtr, 0x140), mload(outputAssetB))
                mstore(add(mPtr, 0x160), mload(add(outputAssetB, 0x20)))
                mstore(add(mPtr, 0x180), mload(add(outputAssetB, 0x40)))
                mstore(add(mPtr, 0x1a0), totalInputValue)
                mstore(add(mPtr, 0x1c0), interactionNonce)
                {
                    let auxData := mload(add(bridgeData, 0xc0))
                    mstore(add(mPtr, 0x1e0), auxData)
                }
                mstore(add(mPtr, 0x200), ethPayments.slot)
                let success := delegatecall(
                    mload(add(bridgeData, 0x160)),
                    sload(defiBridgeProxy.slot),
                    sub(mPtr, 0x04),
                    0x224,
                    mPtr,
                    0x60
                )

                switch success
                case 1 {
                    mstore(bridgeResult, mload(mPtr)) // outputValueA
                    mstore(add(bridgeResult, 0x20), mload(add(mPtr, 0x20))) // outputValueB
                    mstore(add(bridgeResult, 0x40), mload(add(mPtr, 0x40))) // isAsync
                    mstore(add(bridgeResult, 0x60), 1) // success
                }
                default {
                    mstore(bridgeResult, 0) // outputValueA
                    mstore(add(bridgeResult, 0x20), 0) // outputValueB
                    mstore(add(bridgeResult, 0x40), 0) // isAsync
                    mstore(add(bridgeResult, 0x60), 0) // success
                }
            }
            if (!(bridgeData.secondOutputReal || bridgeData.secondOutputVirtual)) {
                bridgeResult.outputValueB = 0;
            }

            // emit events and update state
            assembly {
                let mPtr := mload(0x40)
                // emit DefiBridgeProcessed(indexed bridgeId, indexed interactionNonce, totalInputValue, outputValueA, outputValueB, success)
                {
                    mstore(mPtr, totalInputValue)
                    mstore(add(mPtr, 0x20), mload(bridgeResult)) // outputValueA
                    mstore(add(mPtr, 0x40), mload(add(bridgeResult, 0x20))) // outputValueB
                    mstore(add(mPtr, 0x60), mload(add(bridgeResult, 0x60))) // success
                    log3(mPtr, 0x80, DEFI_BRIDGE_PROCESSED_SIGHASH, bridgeId, interactionNonce)
                }

                // if interaction is Async, update pendingDefiInteractions
                // if interaction is synchronous, compute the interaction hash and add to defiInteractionHashes
                switch mload(add(bridgeResult, 0x40)) // switch isAsync
                case 1 {
                    // pendingDefiInteractions[interactionNonce] = PendingDefiBridgeInteraction(bridgeId, totalInputValue, 0)
                    mstore(0x00, interactionNonce)
                    mstore(0x20, pendingDefiInteractions.slot)
                    let pendingDefiInteractionsSlotBase := keccak256(0x00, 0x40)

                    sstore(pendingDefiInteractionsSlotBase, bridgeId)
                    sstore(add(pendingDefiInteractionsSlotBase, 0x01), totalInputValue)
                }
                default {
                    // compute defiInteractionnHash
                    mstore(mPtr, bridgeId)
                    mstore(add(mPtr, 0x20), interactionNonce)
                    mstore(add(mPtr, 0x40), totalInputValue)
                    mstore(add(mPtr, 0x60), mload(bridgeResult)) // outputValueA
                    mstore(add(mPtr, 0x80), mload(add(bridgeResult, 0x20))) // outputValueB
                    mstore(add(mPtr, 0xa0), mload(add(bridgeResult, 0x60))) // success
                    pop(staticcall(gas(), 0x2, mPtr, 0xc0, 0x00, 0x20))
                    let defiInteractionHash := mod(mload(0x00), CIRCUIT_MODULUS)
                    // // defiInteractionHashes.push(defiInteractionHash) (don't update length, will do this outside of loop)
                    // // reentrancy attacks that modify defiInteractionHashes array should be ruled out because of reentrancyMutex
                    mstore(0x00, defiInteractionHashes.slot)
                    sstore(add(keccak256(0x00, 0x20), defiInteractionHashesLength), defiInteractionHash)
                    defiInteractionHashesLength := add(defiInteractionHashesLength, 0x01)
                }

                // advance interactionNonce and proofDataPtr
                interactionNonce := add(interactionNonce, 0x01)
                proofDataPtr := add(proofDataPtr, 0x20)
            }
        }

        assembly {
            /**
             * Cleanup
             *
             * 1. Copy asyncDefiInteractionHashes into defiInteractionHashes
             * 2. Update defiInteractionHashes.length
             * 2. Clear asyncDefiInteractionHashes.length
             * 3. Clear reentrancyMutex
             */
            let state := sload(rollupState.slot)

            let asyncDefiInteractionHashesLength := and(
                ARRAY_LENGTH_MASK,
                shr(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, state)
            )

            // Validate we are not overflowing our 1024 array size
            // Actually check against a max array size of 1024 - 1 - numberOfBridgeCalls
            // (this is to more easily test this failure condition!)
            // (can set the array length to max of 1023, send a rollup
            //  proof with 1 defi txn and trigger this error state)
            let valid := lt(
                add(asyncDefiInteractionHashesLength, defiInteractionHashesLength),
                sub(ARRAY_LENGTH_MASK, sub(numberOfBridgeCalls, 1))
            )

            // should never hit this! If block `i` generates synchronous txns,
            // block 'i + 1' must process them.
            // Only way this array size hits 1024 is if we produce a glut of async interaction results
            // between blocks. HOWEVER we ensure that async interaction callbacks fail iff they would increase
            // defiInteractionHashes length to be >= 512
            if iszero(valid) {
                let mPtr := mload(0x40)
                // keccak256("ARRAY_OVERFLOW()")
                mstore(mPtr, 0x58a4ab0e00000000000000000000000000000000000000000000000000000000)
                revert(mPtr, 0x04)
            }

            // copy async hashes into defiInteractionHashes
            mstore(0x00, defiInteractionHashes.slot)
            let defiSlotBase := add(keccak256(0x00, 0x20), defiInteractionHashesLength)
            mstore(0x00, asyncDefiInteractionHashes.slot)
            let asyncDefiSlotBase := keccak256(0x00, 0x20)
            for {
                let i := 0
            } lt(i, asyncDefiInteractionHashesLength) {
                i := add(i, 0x01)
            } {
                sstore(add(defiSlotBase, i), sload(add(asyncDefiSlotBase, i)))
            }

            // clear defiInteractionHashesLength in state
            state := and(not(shl(DEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)

            // write new defiInteractionHashesLength in state
            state := or(
                shl(
                    DEFIINTERACTIONHASHES_BIT_OFFSET,
                    add(asyncDefiInteractionHashesLength, defiInteractionHashesLength)
                ),
                state
            )

            // clear asyncDefiInteractionHashesLength in state
            state := and(not(shl(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)

            // write new state
            sstore(rollupState.slot, state)
        }
    }

    /**
     * @dev Process asyncdefi interactions.
     *      Callback function for asynchronous bridge interactions.
     *      Can only be called by the bridge contract linked to the interactionNonce
     * @param interactionNonce - unique id of the interaection
     */
    function processAsyncDefiInteraction(uint256 interactionNonce) external {
        // If the re-entrancy mutex is not set, set it!
        // The re-entrancy mutex guards against nested calls to `processRollup()` and deposit functions.
        bool startingMutexValue = getReentrancyMutex();
        if (!startingMutexValue) {
            setReentrancyMutex();
        }

        uint256 bridgeId;
        uint256 totalInputValue;
        assembly {
            mstore(0x00, interactionNonce)
            mstore(0x20, pendingDefiInteractions.slot)
            let interactionPtr := keccak256(0x00, 0x40)

            bridgeId := sload(interactionPtr)
            totalInputValue := sload(add(interactionPtr, 0x01))

            // delete pendingDefiInteractions[interactionNonce]
            // N.B. only need to delete 1st slot value `bridgeId`. Deleting vars costs gas post-London
            // setting bridgeId to 0 is enough to cause future calls with this interaction nonce to fail
            sstore(interactionPtr, 0x00)
        }
        if (bridgeId == 0) {
            revert INVALID_BRIDGE_ID();
        }
        BridgeData memory bridgeData = getBridgeData(bridgeId);

        (
            AztecTypes.AztecAsset memory inputAssetA,
            AztecTypes.AztecAsset memory inputAssetB,
            AztecTypes.AztecAsset memory outputAssetA,
            AztecTypes.AztecAsset memory outputAssetB
        ) = getAztecAssetTypes(bridgeData, interactionNonce);

        // Extract the bridge address from the bridgeId
        IDefiBridge bridgeContract;
        assembly {
            mstore(0x00, supportedBridges.slot)
            let bridgeSlot := keccak256(0x00, 0x20)

            bridgeContract := and(bridgeId, 0xffffffff)
            bridgeContract := sload(add(bridgeSlot, sub(bridgeContract, 0x01)))
            // mask non-address bytes (TODO is this neccessary?)
            bridgeContract := and(bridgeContract, 0xffffffffffffffffffffffffffffffffffffffff)
        }
        if (address(bridgeContract) == address(0)) {
            revert INVALID_BRIDGE_ADDRESS();
        }
        // Copy some variables to front of stack to get around stack too deep errors
        uint256 totalInputValueCopy = totalInputValue;
        uint256 interactionNonceCopy = interactionNonce;
        uint64 auxDataCopy = uint64(bridgeData.auxData);
        (uint256 outputValueA, uint256 outputValueB) = bridgeContract.finalise(
            inputAssetA,
            inputAssetB,
            outputAssetA,
            outputAssetB,
            totalInputValueCopy,
            interactionNonceCopy,
            auxDataCopy
        );

        if (outputValueB > 0 && outputAssetB.assetType == AztecTypes.AztecAssetType.NOT_USED) {
            revert NONZERO_OUTPUT_VALUE_ON_NOT_USED_ASSET(outputValueB);
        }
        if (outputValueA == 0 && outputValueB == 0) {
            // issue refund.
            transferTokensAsync(address(bridgeContract), inputAssetA, totalInputValue, interactionNonceCopy);
        } else {
            // transfer output tokens to rollup contract
            transferTokensAsync(address(bridgeContract), outputAssetA, outputValueA, interactionNonceCopy);
            transferTokensAsync(address(bridgeContract), outputAssetB, outputValueB, interactionNonceCopy);
        }

        // compute defiInteractionHash and push it onto the asyncDefiInteractionHashes array
        bool result;
        assembly {
            result := iszero(and(eq(outputValueA, 0), eq(outputValueB, 0)))
            let mPtr := mload(0x40)
            mstore(mPtr, bridgeId)
            mstore(add(mPtr, 0x20), interactionNonceCopy)
            mstore(add(mPtr, 0x40), totalInputValueCopy)
            mstore(add(mPtr, 0x60), outputValueA)
            mstore(add(mPtr, 0x80), outputValueB)
            mstore(add(mPtr, 0xa0), result)
            pop(staticcall(gas(), 0x2, mPtr, 0xc0, 0x00, 0x20))
            let defiInteractionHash := mod(mload(0x00), CIRCUIT_MODULUS)

            // push async defi interaction hash
            mstore(0x00, asyncDefiInteractionHashes.slot)
            let slotBase := keccak256(0x00, 0x20)

            let state := sload(rollupState.slot)
            let asyncArrayLen := and(ARRAY_LENGTH_MASK, shr(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, state))
            let defiArrayLen := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, state))

            // check that size of asyncDefiInteractionHashes isn't such that
            // adding 1 to it will make the next block's defiInteractionHashes length hit 512
            if gt(add(add(1, asyncArrayLen), defiArrayLen), 512) {
                // store keccak256("ARRAY_OVERFLOW()")
                // this code is equivalent to `revert ARRAY_OVERFLOW()`
                mstore(mPtr, 0x58a4ab0e00000000000000000000000000000000000000000000000000000000)
                revert(mPtr, 0x04)
            }

            // asyncDefiInteractionHashes.push(defiInteractionHash)
            sstore(add(slotBase, asyncArrayLen), defiInteractionHash)

            // update asyncDefiInteractionHashes.length by 1
            let oldState := and(not(shl(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)
            let newState := or(oldState, shl(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, add(asyncArrayLen, 0x01)))

            sstore(rollupState.slot, newState)
        }
        emit AsyncDefiBridgeProcessed(bridgeId, interactionNonce, totalInputValue, outputValueA, outputValueB, result);

        // clear the re-entrancy mutex if it was false at the start of this function
        if (!startingMutexValue) {
            clearReentrancyMutex();
        }
    }

    function transferTokensAsync(
        address bridgeContract,
        AztecTypes.AztecAsset memory asset,
        uint256 outputValue,
        uint256 interactionNonce
    ) internal {
        if (asset.assetType == AztecTypes.AztecAssetType.ETH) {
            require(outputValue == ethPayments[interactionNonce], 'argh insufficient eth payment');
            ethPayments[interactionNonce] = 0;
        } else if (asset.assetType == AztecTypes.AztecAssetType.ERC20 && outputValue > 0) {
            address tokenAddress = asset.erc20Address;
            bool success;
            TokenTransfers.safeTransferFrom(tokenAddress, bridgeContract, address(this), outputValue);
        }
    }

    /**
     * @dev Transfer a fee to the feeReceiver
     * @param proofData proof of knowledge of a rollup block update
     * @param feeReceiver fee beneficiary as described by the rollup provider
     */
    function transferFee(bytes memory proofData, address feeReceiver) internal {
        for (uint256 i = 0; i < numberOfAssets; ++i) {
            uint256 assetId = extractAssetId(proofData, i);
            uint256 txFee = extractTotalTxFee(proofData, i);
            if (txFee > 0) {
                if (assetId == ethAssetId) {
                    // We explicitly do not throw if this call fails, as this opens up the possiblity of
                    // griefing attacks, as engineering a failed fee will invalidate an entire rollup block
                    payable(feeReceiver).call{gas: 50000, value: txFee}('');
                } else {
                    address assetAddress = getSupportedAsset(assetId);
                    TokenTransfers.transferToDoNotBubbleErrors(
                        assetAddress,
                        feeReceiver,
                        txFee,
                        assetGasLimits[assetId]
                    );
                }
            }
        }
    }

    /**
     * @dev Internal utility function to withdraw funds from the contract to a receiver address
     * @param withdrawValue - value being withdrawn from the contract
     * @param receiverAddress - address receiving public ERC20 tokens
     * @param assetId - ID of the asset for which a withdrawl is being performed
     */
    function withdraw(
        uint256 withdrawValue,
        address receiverAddress,
        uint256 assetId
    ) internal {
        validateAssetIdIsNotVirtual(assetId);
        if (receiverAddress == address(0)) {
            revert WITHDRAW_TO_ZERO_ADDRESS();
        }
        if (assetId == 0) {
            // We explicitly do not throw if this call fails, as this opens up the possiblity of
            // griefing attacks, as engineering a failed withdrawal will invalidate an entire rollup block
            payable(receiverAddress).call{gas: 30000, value: withdrawValue}('');
        } else {
            // We explicitly do not throw if this call fails, as this opens up the possiblity of
            // griefing attacks, as engineering a failed withdrawal will invalidate an entire rollup block
            // the user should ensure their withdrawal will succeed or they will loose funds
            address assetAddress = getSupportedAsset(assetId);
            TokenTransfers.transferToDoNotBubbleErrors(
                assetAddress,
                receiverAddress,
                withdrawValue,
                assetGasLimits[assetId]
            );
        }
    }
}

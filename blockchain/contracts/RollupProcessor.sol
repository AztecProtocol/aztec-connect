// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';

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
contract RollupProcessor is IRollupProcessor, Decoder, Initializable, OwnableUpgradeable, PausableUpgradeable {
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
    error BRIDGE_ID_IS_INCONSISTENT();
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
    error INSUFFICIENT_ETH_TRANSFER();
    error WITHDRAW_TO_ZERO_ADDRESS();
    error INVALID_DEPOSITOR();
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
    error THIRD_PARTY_CONTRACTS_FLAG_NOT_SET();

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
    //       uint256 ethPaymentsSlot
    //       address rollupBeneficary)
    // N.B. this is the selector of the 'convert' function of the DefiBridgeProxy contract.
    //      This has a different interface to the IDefiBridge.convert function
    bytes4 private constant DEFI_BRIDGE_PROXY_CONVERT_SELECTOR = 0x4bd947a8;

    /*----------------------------------------
      CONSTANT STATE VARIABLES
      ----------------------------------------*/

    uint256 private constant ethAssetId = 0; // if assetId == ethAssetId, treat as native ETH and not ERC20 token
    bool public allowThirdPartyContracts;

    // starting root hash of the DeFi interaction result Merkle tree
    bytes32 private constant INIT_DEFI_ROOT = 0x2e4ab7889ab3139204945f9e722c7a8fdb84e66439d787bd066c3d896dba04ea;

    bytes32 private constant DEFI_BRIDGE_PROCESSED_SIGHASH =
        0x1ccb5390975e3d07503983a09c3b6a5d11a0e40c4cb4094a7187655f643ef7b4;

    bytes32 private constant ASYNC_BRIDGE_PROCESSED_SIGHASH =
        0x38ce48f4c2f3454bcf130721f25a4262b2ff2c8e36af937b30edf01ba481eb1d;

    // We need to cap the amount of gas sent to the DeFi bridge contract for two reasons.
    // 1: To provide consistency to rollup providers around costs.
    // 2: To prevent griefing attacks where a bridge consumes all our gas.
    uint256 private constant MIN_BRIDGE_GAS_LIMIT = 35000;
    uint256 private constant MIN_ERC20_GAS_LIMIT = 55000;
    uint256 private constant MAX_BRIDGE_GAS_LIMIT = 5000000;
    uint256 private constant MAX_ERC20_GAS_LIMIT = 1500000;

    // Bit offsets and bit masks used to convert a `uint256 bridgeId` into a BridgeData member
    uint256 private constant INPUT_ASSET_ID_A_SHIFT = 32;
    uint256 private constant OUTPUT_ASSET_ID_A_SHIFT = 62;
    uint256 private constant OUTPUT_ASSET_ID_B_SHIFT = 92;
    uint256 private constant INPUT_ASSET_ID_B_SHIFT = 122;
    uint256 private constant BITCONFIG_SHIFT = 152;
    uint256 private constant AUX_DATA_SHIFT = 184;
    uint256 private constant MASK_THIRTY_TWO_BITS = 0xffffffff;
    uint256 private constant MASK_THIRTY_BITS = 0x3fffffff;
    uint256 private constant MASK_SIXTY_FOUR_BITS = 0xffffffffffffffff;

    // Offsets and masks used to encode/decode the stateHash storage variable of RollupProcessor
    uint256 private constant DATASIZE_BIT_OFFSET = 160;
    uint256 private constant ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET = 192;
    uint256 private constant DEFIINTERACTIONHASHES_BIT_OFFSET = 208;
    uint256 private constant REENTRANCY_MUTEX_BIT_OFFSET = 224;
    uint256 private constant ARRAY_LENGTH_MASK = 0x3ff; // 1023
    uint256 private constant DATASIZE_MASK = 0xffffffff;

    /*----------------------------------------
      PRIVATE/INTERNAL STATE VARIABLES
      ----------------------------------------*/
    // asyncDefiInteractionHashes and defiInteractionHashes are custom implementations of an array type!!
    // we store the length fields for each array inside the `rollupState` storage slot
    // we access array elements in the traditional manner: array.slot[i] = keccak256(array.slot + i)
    // however we do NOT use slot to recover the length of the array (e.g. normally this would be `length := sload(array.slot)`
    // this reduces the number of storage slots we write to when processing a rollup
    // (each slot costs 5,000 gas to update, saves us 10k gas per rollup tx)
    bytes32 internal asyncDefiInteractionHashes; // defi interaction hashes to be transferred into pending defi interaction hashes
    bytes32 internal defiInteractionHashes;

    // Mapping from assetId to mapping of userAddress to public userBalance stored on this contract
    mapping(uint256 => mapping(address => uint256)) internal userPendingDeposits;

    mapping(address => mapping(bytes32 => bool)) public depositProofApprovals;

    /**
     * @dev RollupState struct contains the following data (offsets are for when used as storage slot):
     *
     * | bit offset   | num bits    | description |
     * | ---          | ---         | ---         |
     * | 0            | 160         | PLONK verifier contract address |
     * | 160          | 32          | datasize: number of filled entries in note tree |
     * | 192          | 16          | asyncDefiInteractionHashes.length : number of entries in asyncDefiInteractionHashes array |
     * | 208          | 16          | defiInteractionHashes.length : number of entries in defiInteractionHashes array |
     * | 224          | 1           | reentrancyMutex used to guard against reentrancy attacks
     */
    struct RollupState {
        IVerifier verifier;
        uint32 datasize;
        uint16 numAsyncDefiInteractionHashes;
        uint16 numDefiInteractionHashes;
        bool reentrancyMutex;
    }
    RollupState internal rollupState;

    /*----------------------------------------
      PUBLIC STATE VARIABLES
      ----------------------------------------*/
    bytes32 public rollupStateHash;

    address public override defiBridgeProxy;

    uint256 public escapeBlockLowerBound;
    uint256 public escapeBlockUpperBound;

    // Array of supported ERC20 token address.
    address[] public supportedAssets;

    // Array of supported bridge contract addresses (similar to assetIds)
    address[] public supportedBridges;

    mapping(address => bool) public rollupProviders;

    // we need a way to register ERC20 Gas Limits for withdrawals to a specific asset id
    mapping(uint256 => uint256) public assetGasLimit;

    // map defiInteractionNonce to PendingDefiBridgeInteraction
    mapping(uint256 => PendingDefiBridgeInteraction) public pendingDefiInteractions;

    /**
     * @dev Used by brige contracts to send RollupProcessor ETH during a bridge interaction
     */
    mapping(uint256 => uint256) public ethPayments;

    // we need a way to register ERC20 Gas Limits for withdrawals to a specific asset id
    mapping(uint256 => uint256) public assetGasLimits;

    // we need a way to register Bridge Gas Limits for dynamic limits per DeFi protocol
    mapping(uint256 => uint256) public bridgeGasLimits;

    // stores the hash of the hashes of the pending defi interactions, the notes of which are expected to be added in the 'next' rollup
    bytes32 public prevDefiInteractionsHash;

    // the value of hashing a 'zeroed' defi interaction result
    bytes32 private constant DEFI_RESULT_ZERO_HASH = 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4;

    /*----------------------------------------
      EVENTS
      ----------------------------------------*/
    event OffchainData(uint256 indexed rollupId, address sender);
    event RollupProcessed(uint256 indexed rollupId, bytes32[] nextExpectedDefiHashes, address sender);
    event DefiBridgeProcessed(
        uint256 indexed bridgeId,
        uint256 indexed nonce,
        uint256 totalInputValue,
        uint256 totalOutputValueA,
        uint256 totalOutputValueB,
        bool result
    );
    event AsyncDefiBridgeProcessed(uint256 indexed bridgeId, uint256 indexed nonce, uint256 totalInputValue);
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
     * @dev Contains information that describes a specific DeFi bridge
     * @notice A single smart contract can be used to represent multiple bridges
     *
     * @param bridgeAddressId the bridge contract address = supportedBridges[bridgeAddressId]
     * @param bridgeAddress   the bridge contract address
     * @param inputAssetIdA
     */
    struct BridgeData {
        uint256 bridgeAddressId;
        address bridgeAddress;
        uint256 inputAssetIdA;
        uint256 outputAssetIdA;
        uint256 outputAssetIdB;
        uint256 inputAssetIdB;
        uint256 auxData;
        bool firstInputVirtual;
        bool secondInputVirtual;
        bool firstOutputVirtual;
        bool secondOutputVirtual;
        bool secondInputReal;
        bool secondOutputReal;
        uint256 bridgeGasLimit;
    }

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

    /**
     * @dev Container for the inputs of a Defi interaction
     * @param totalInputValue number of tokens/wei sent to the bridge
     * @param interactionNonce the unique id of the interaction
     * @param auxData additional input specific to the type of interaction
     */
    struct InteractionInputs {
        uint256 totalInputValue;
        uint256 interactionNonce;
        uint64 auxData;
    }

    /*----------------------------------------
      FUNCTIONS
      ----------------------------------------*/

    /**
     * @dev get the number of filled entries in the data tree.
     * This is equivalent to the number of notes created in the Aztec L2
     * @return dataSize
     */
    function getDataSize() public view returns (uint256 dataSize) {
        assembly {
            dataSize := and(DATASIZE_MASK, shr(DATASIZE_BIT_OFFSET, sload(rollupState.slot)))
        }
    }

    /**
     * @dev get the value of the reentrancy mutex
     */
    function getReentrancyMutex() internal view returns (bool mutexValue) {
        assembly {
            mutexValue := shr(REENTRANCY_MUTEX_BIT_OFFSET, sload(rollupState.slot))
        }
    }

    /**
     * @dev set the reentrancy mutex to true
     */
    function setReentrancyMutex() internal {
        assembly {
            let oldState := sload(rollupState.slot)
            let updatedState := or(shl(REENTRANCY_MUTEX_BIT_OFFSET, 1), oldState)
            sstore(rollupState.slot, updatedState)
        }
    }

    /**
     * @dev clear the reentrancy mutex
     */
    function clearReentrancyMutex() internal {
        assembly {
            let oldState := sload(rollupState.slot)
            let updatedState := and(not(shl(REENTRANCY_MUTEX_BIT_OFFSET, 1)), oldState)
            sstore(rollupState.slot, updatedState)
        }
    }

    /**
     * @dev validate the reentrancy mutex is not set. Throw if it is
     */
    function reentrancyMutexCheck() internal view {
        bool mutexValue;
        assembly {
            mutexValue := shr(REENTRANCY_MUTEX_BIT_OFFSET, sload(rollupState.slot))
        }
        if (mutexValue) {
            revert REENTRANCY_MUTEX_SET();
        }
    }

    /**
     * @dev Get number of defi interaction hashes
     * A defi interaction hash represents a synchronous defi interaction that has resolved, but whose interaction result data
     * has not yet been added into the Aztec Defi Merkle tree. This step is needed in order to convert L2 Defi claim notes into L2 value notes
     * @return res the number of pending defi interaction hashes
     */
    function getDefiInteractionHashesLength() internal view returns (uint256 res) {
        assembly {
            res := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, sload(rollupState.slot)))
        }
    }

    /**
     * @dev Get number of asynchronous defi interaction hashes
     * An async defi interaction hash represents an asynchronous defi interaction that has resolved, but whose interaction result data
     * has not yet been added into the Aztec Defi Merkle tree. This step is needed in order to convert L2 Defi claim notes into L2 value notes
     * @return res the number of pending async defi interaction hashes
     */
    function getAsyncDefiInteractionHashesLength() internal view returns (uint256 res) {
        assembly {
            res := and(ARRAY_LENGTH_MASK, shr(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, sload(rollupState.slot)))
        }
    }

    /**
     * @dev Get all pending defi interaction hashes
     * A defi interaction hash represents a synchronous defi interaction that has resolved, but whose interaction result data
     * has not yet been added into the Aztec Defi Merkle tree. This step is needed in order to convert L2 Defi claim notes into L2 value notes
     * @return res the set of all pending defi interaction hashes
     */
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

    /**
     * @dev Get all pending async defi interaction hashes
     * An async defi interaction hash represents an asynchronous defi interaction that has resolved, but whose interaction result data
     * has not yet been added into the Aztec Defi Merkle tree. This step is needed in order to convert L2 Defi claim notes into L2 value notes
     * @return res the set of all pending async defi interaction hashes
     */
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
     * @dev Get number of pending defi interactions that have resolved but have not yet added into the Defi Tree
     * This value can never exceed 512. This is to prevent griefing attacks; `processRollup` iterates through `asyncDefiInteractionHashes[]` and
     * copies their values into `defiInteractionHashes[]`. Loop is bounded to < 512 so that tx does not exceed block gas limit
     * @return res the number of pending interactions
     */
    function getPendingDefiInteractionHashes() public view returns (uint256 res) {
        assembly {
            let state := sload(rollupState.slot)
            let defiInteractionHashesLength := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, state))
            let asyncDefiInteractionhashesLength := and(
                ARRAY_LENGTH_MASK,
                shr(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, state)
            )
            res := add(defiInteractionHashesLength, asyncDefiInteractionhashesLength)
        }
    }

    /**
     * @dev Initialiser function. Emulates constructor behaviour for upgradeable contracts
     * @param _verifierAddress the address of the Plonk verification smart contract
     * @param _escapeBlockLowerBound defines start of escape hatch window
     * @param _escapeBlockUpperBound defines end of the escape hatch window
     * @param _defiBridgeProxy address of the proxy contract that we route defi bridge calls through via `delegateCall`
     * @param _contractOwner owner address of RollupProcessor. Should be a multisig contract
     * @param _initDataRoot starting state of the Aztec data tree. Init tree state should be all-zeroes excluding migrated account notes
     * @param _initNullRoot starting state of the Aztec nullifier tree. Init tree state should be all-zeroes excluding migrated account nullifiers
     * @param _initRootRoot starting state of the Aztec data roots tree. Init tree state should be all-zeroes excluding 1 leaf containing _initDataRoot
     * @param _initDatasize starting size of the Aztec data tree.
     * @param _allowThirdPartyContracts flag that specifies whether 3rd parties are allowed to add state to the contract
     */
    function initialize(
        address _verifierAddress,
        uint256 _escapeBlockLowerBound,
        uint256 _escapeBlockUpperBound,
        address _defiBridgeProxy,
        address _contractOwner,
        bytes32 _initDataRoot,
        bytes32 _initNullRoot,
        bytes32 _initRootRoot,
        uint32 _initDatasize,
        bool _allowThirdPartyContracts
    ) external initializer {
        __Ownable_init();
        transferOwnership(_contractOwner);
        __Pausable_init();
        // compute rollupStateHash
        assembly {
            let mPtr := mload(0x40)
            mstore(mPtr, 0) // nextRollupId
            mstore(add(mPtr, 0x20), _initDataRoot)
            mstore(add(mPtr, 0x40), _initNullRoot)
            mstore(add(mPtr, 0x60), _initRootRoot)
            mstore(add(mPtr, 0x80), INIT_DEFI_ROOT)
            sstore(rollupStateHash.slot, keccak256(mPtr, 0xa0))
        }
        rollupState.datasize = _initDatasize;
        rollupState.verifier = IVerifier(_verifierAddress);
        defiBridgeProxy = _defiBridgeProxy;
        escapeBlockLowerBound = _escapeBlockLowerBound;
        escapeBlockUpperBound = _escapeBlockUpperBound;
        allowThirdPartyContracts = _allowThirdPartyContracts;
        // initial value of the hash of 32 'zero' defi note hashes
        prevDefiInteractionsHash = 0x14e0f351ade4ba10438e9b15f66ab2e6389eea5ae870d6e8b2df1418b2e6fd5b;
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
        assembly {
            // ethPayments[interactionNonce] += msg.value
            mstore(0x00, interactionNonce)
            mstore(0x20, ethPayments.slot)
            let slot := keccak256(0x00, 0x40)
            // no need to check for overflows as this would require sending more than the blockchain's total supply of ETH!
            sstore(slot, add(sload(slot), callvalue()))
        }
    }

    /**
     * @dev adds/removes an authorized rollup provider that can publish rollup blocks. Admin only
     * @param providerAddress address of rollup provider
     * @param valid are we adding or removing the provider?
     */
    function setRollupProvider(address providerAddress, bool valid) external override onlyOwner {
        rollupProviders[providerAddress] = valid;
        emit RollupProviderUpdated(providerAddress, valid);
    }

    /**
     * @dev sets the address of the PLONK verification smart contract. Admin only
     * @param _verifierAddress address of the verification smart contract
     */
    function setVerifier(address _verifierAddress) public override onlyOwner {
        rollupState.verifier = IVerifier(_verifierAddress);
        emit VerifierUpdated(_verifierAddress);
    }

    /**
     * @dev get the address of the PLONK verification smart contract
     * @return verifier address of the verification smart contract
     */
    function verifier() public view returns (address verifier) {
        // asm implementation to reduce compiled bytecode size
        assembly {
            verifier := and(sload(rollupState.slot), ADDRESS_MASK)
        }
    }

    /**
     * @dev Modifier to protect functions from being called while the contract is still in BETA.
     */

    modifier checkThirdPartyContractStatus() {
        if (owner() != _msgSender() && !allowThirdPartyContracts) {
            revert THIRD_PARTY_CONTRACTS_FLAG_NOT_SET();
        }
        _;
    }

    /**
     * @dev Set a flag that allows a third party dev to register Assets and bridges.
     * Protected by onlyOwner
     * @param _flag - bool if the flag should be set or not
     */

    function setAllowThirdPartyContracts(bool _flag) external override onlyOwner {
        allowThirdPartyContracts = _flag;
    }

    /**
     * @dev sets the address of the defi bridge proxy. Admin only
     * @param defiBridgeProxyAddress address of the defi bridge proxy contract
     */
    function setDefiBridgeProxy(address defiBridgeProxyAddress) public override onlyOwner {
        defiBridgeProxy = defiBridgeProxyAddress;
    }

    /**
     * @dev Approve a proofHash for spending a users deposited funds, this is one way and must be called by the owner of the funds
     * @param _proofHash - keccack256 hash of the inner proof public inputs
     */
    function approveProof(bytes32 _proofHash) public override whenNotPaused {
        // asm implementation to reduce compiled bytecode size
        assembly {
            // depositProofApprovals[msg.sender][_proofHash] = true;
            mstore(0x00, caller())
            mstore(0x20, depositProofApprovals.slot)
            mstore(0x20, keccak256(0x00, 0x40))
            mstore(0x00, _proofHash)
            sstore(keccak256(0x00, 0x40), 1)
        }
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
     * @dev helper function to sanitise a given bridge gas limit value to be within pre-defined limits
     * @param bridgeGasLimit - the gas limit that needs to be sanitised
     */
    function sanitiseBridgeGasLimit(uint256 bridgeGasLimit) internal pure returns (uint256) {
        if (bridgeGasLimit < MIN_BRIDGE_GAS_LIMIT) {
            return MIN_BRIDGE_GAS_LIMIT;
        }
        if (bridgeGasLimit > MAX_BRIDGE_GAS_LIMIT) {
            return MAX_BRIDGE_GAS_LIMIT;
        }
        return bridgeGasLimit;
    }

    /**
     * @dev helper function to sanitise a given asset gas limit value to be within pre-defined limits
     * @param assetGasLimit - the gas limit that needs to be sanitised
     */
    function sanitiseAssetGasLimit(uint256 assetGasLimit) internal pure returns (uint256) {
        if (assetGasLimit < MIN_ERC20_GAS_LIMIT) {
            return MIN_ERC20_GAS_LIMIT;
        }
        if (assetGasLimit > MAX_ERC20_GAS_LIMIT) {
            return MAX_ERC20_GAS_LIMIT;
        }
        return assetGasLimit;
    }

    /**
     * @dev Get the gas limit for the bridge specified by bridgeAddressId
     * @param bridgeAddressId - identifier used to denote a particular bridge
     */
    function getBridgeGasLimit(uint256 bridgeAddressId) public view override returns (uint256) {
        return bridgeGasLimits[bridgeAddressId];
    }

    /**
     * @dev Get the addresses of all supported bridge contracts
     */
    function getSupportedBridges() external view override returns (address[] memory, uint256[] memory) {
        uint256[] memory gasLimits = new uint256[](supportedBridges.length);
        for (uint256 i = 0; i < supportedBridges.length; ++i) {
            gasLimits[i] = bridgeGasLimits[i + 1];
        }
        return (supportedBridges, gasLimits);
    }

    /**
     * @dev Get the addresses of all supported ERC20 tokens
     */
    function getSupportedAssets() external view override returns (address[] memory, uint256[] memory) {
        uint256[] memory gasLimits = new uint256[](supportedAssets.length);
        for (uint256 i = 0; i < supportedAssets.length; ++i) {
            gasLimits[i] = assetGasLimits[i + 1];
        }
        return (supportedAssets, gasLimits);
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
    function getUserPendingDeposit(uint256 assetId, address userAddress)
        external
        view
        override
        returns (uint256 userPendingDeposit)
    {
        assembly {
            mstore(0x00, assetId)
            mstore(0x20, userPendingDeposits.slot)
            mstore(0x20, keccak256(0x00, 0x40))
            mstore(0x00, userAddress)
            userPendingDeposit := sload(keccak256(0x00, 0x40))
        }
    }

    /**
     * @dev Increase the userPendingDeposits mapping
     * assembly impl to reduce compiled bytecode size and improve gas costs
     */
    function increasePendingDepositBalance(
        uint256 assetId,
        address depositorAddress,
        uint256 amount
    ) internal {
        validateAssetIdIsNotVirtual(assetId);
        assembly {
            // userPendingDeposit = userPendingDeposits[assetId][depositorAddress]
            mstore(0x00, assetId)
            mstore(0x20, userPendingDeposits.slot)
            mstore(0x20, keccak256(0x00, 0x40))
            mstore(0x00, depositorAddress)
            let userPendingDepositSlot := keccak256(0x00, 0x40)
            let userPendingDeposit := sload(userPendingDepositSlot)
            let newDeposit := add(userPendingDeposit, amount)
            if lt(newDeposit, userPendingDeposit) {
                revert(0, 0)
            }
            sstore(userPendingDepositSlot, newDeposit)
        }
    }

    /**
     * @dev Decrease the userPendingDeposits mapping
     * assembly impl to reduce compiled bytecode size. Also removes a sload op and saves a fair chunk of gas per deposit tx
     */
    function decreasePendingDepositBalance(
        uint256 assetId,
        address transferFromAddress,
        uint256 amount
    ) internal {
        validateAssetIdIsNotVirtual(assetId);
        bool insufficientDeposit = false;
        assembly {
            // userPendingDeposit = userPendingDeposits[assetId][transferFromAddress]
            mstore(0x00, assetId)
            mstore(0x20, userPendingDeposits.slot)
            mstore(0x20, keccak256(0x00, 0x40))
            mstore(0x00, transferFromAddress)
            let userPendingDepositSlot := keccak256(0x00, 0x40)
            let userPendingDeposit := sload(userPendingDepositSlot)

            insufficientDeposit := lt(userPendingDeposit, amount)

            let newDeposit := sub(userPendingDeposit, amount)

            sstore(userPendingDepositSlot, newDeposit)
        }

        if (insufficientDeposit) {
            revert INSUFFICIENT_DEPOSIT();
        }
    }

    /**
     * @dev Set the mapping between an assetId and the address of the linked asset.
     * @param linkedToken - address of the asset
     * @param gasLimit - uint256 gas limit for ERC20 token transfers of this asset
     */
    function setSupportedAsset(address linkedToken, uint256 gasLimit) external override checkThirdPartyContractStatus {
        if (linkedToken == address(0)) {
            revert INVALID_LINKED_TOKEN_ADDRESS();
        }

        supportedAssets.push(linkedToken);

        uint256 assetId = supportedAssets.length;
        assetGasLimits[assetId] = sanitiseAssetGasLimit(gasLimit);

        emit AssetAdded(assetId, linkedToken, assetGasLimits[assetId]);
    }

    /**
     * @dev Set the mapping between an bridge contract id and the address of the linked bridge contract.
     * @param linkedBridge - address of the bridge contract
     * @param gasLimit - uint256 gas limit to send to the bridge convert function
     */

    function setSupportedBridge(address linkedBridge, uint256 gasLimit)
        external
        override
        checkThirdPartyContractStatus
    {
        if (linkedBridge == address(0)) {
            revert INVALID_LINKED_BRIDGE_ADDRESS();
        }
        supportedBridges.push(linkedBridge);

        uint256 bridgeAddressId = supportedBridges.length;
        bridgeGasLimits[bridgeAddressId] = sanitiseBridgeGasLimit(gasLimit);

        emit BridgeAdded(bridgeAddressId, linkedBridge, bridgeGasLimits[bridgeAddressId]);
    }

    /**
     * @dev Deposit funds as part of the first stage of the two stage deposit. Non-permit flow
     * @param assetId - unique ID of the asset
     * @param amount - number of tokens being deposited
     * @param owner - address that can spend the deposited funds
     * @param proofHash - the 32 byte transaction id that can spend the deposited funds
     */
    function depositPendingFunds(
        uint256 assetId,
        uint256 amount,
        address owner,
        bytes32 proofHash
    ) external payable override whenNotPaused {
        // Guard against defi bridges calling `depositPendingFunds` when processRollup calls their `convert` function
        reentrancyMutexCheck();

        if (assetId == ethAssetId) {
            if (msg.value != amount) {
                revert MSG_VALUE_WRONG_AMOUNT();
            }
            increasePendingDepositBalance(assetId, owner, amount);
        } else {
            if (msg.value != 0) {
                revert DEPOSIT_TOKENS_WRONG_PAYMENT_TYPE();
            }
            if (owner != msg.sender) {
                revert INVALID_DEPOSITOR();
            }

            address assetAddress = getSupportedAsset(assetId);
            internalDeposit(assetId, assetAddress, owner, amount);
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
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override whenNotPaused {
        reentrancyMutexCheck();
        address assetAddress = getSupportedAsset(assetId);
        IERC20Permit(assetAddress).permit(depositorAddress, address(this), amount, deadline, v, r, s);
        internalDeposit(assetId, assetAddress, depositorAddress, amount);

        if (proofHash != '') {
            approveProof(proofHash);
        }
    }

    /**
     * @dev Deposit funds as part of the first stage of the two stage deposit. Permit flow
     * @param assetId - unique ID of the asset
     * @param amount - number of tokens being deposited
     * @param depositorAddress - address from which funds are being transferred to the contract
     * @param proofHash - the 32 byte transaction id that can spend the deposited funds
     * @param nonce - user's nonce on the erc20 contract, for replay protection
     * @param deadline - when the permit signature expires
     * @param v - ECDSA sig param
     * @param r - ECDSA sig param
     * @param s - ECDSA sig param
     */
    function depositPendingFundsPermitNonStandard(
        uint256 assetId,
        uint256 amount,
        address depositorAddress,
        bytes32 proofHash,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override whenNotPaused {
        reentrancyMutexCheck();
        address assetAddress = getSupportedAsset(assetId);
        IERC20Permit(assetAddress).permit(depositorAddress, address(this), nonce, deadline, true, v, r, s);
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
     * @dev Used to publish data that doesn't need to be on chain. Should eventually be published elsewhere.
     * This maybe called multiple times to work around maximum tx size limits.
     * The data will need to be reconstructed by the client.
     * @param rollupId - the rollup id this data is related to.
     * @param - the data.
     */
    function offchainData(
        uint256 rollupId,
        bytes calldata /* offchainTxData */
    ) external override whenNotPaused {
        emit OffchainData(rollupId, msg.sender);
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
        bytes calldata signatures
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
        address rollupBeneficiary = extractRollupBeneficiaryAddress(proofData);

        processRollupProof(proofData, signatures, numTxs, publicInputsHash, rollupBeneficiary);

        transferFee(proofData, rollupBeneficiary);

        clearReentrancyMutex();
    }

    /**
     * @dev processes a rollup proof. Will verify the proof's correctness and use the provided
     * proof data to update the rollup state + merkle roots, as well as validate/enact any deposits/withdrawals in the block.
     * Finally any defi interactions specified in the block will be executed
     * @param proofData the block's proof data (contains PLONK proof and public input data linked to the proof)
     * @param signatures ECDSA signatures from users authorizing deposit transactions
     * @param numTxs the number of transactions in the block
     * @param publicInputsHash the SHA256 hash of the proof's public inputs
     */
    function processRollupProof(
        bytes memory proofData,
        bytes memory signatures,
        uint256 numTxs,
        uint256 publicInputsHash,
        address rollupBeneficiary
    ) internal {
        uint256 rollupId = verifyProofAndUpdateState(proofData, publicInputsHash);
        processDepositsAndWithdrawals(proofData, numTxs, signatures);
        bytes32[] memory nextDefiHashes = processDefiBridges(proofData, rollupBeneficiary);
        emit RollupProcessed(rollupId, nextDefiHashes, msg.sender);
    }

    /**
     * @dev Verify the zk proof and update the contract state variables with those provided by the rollup.
     * @param proofData - cryptographic zk proof data. Passed to the verifier for verification.
     */
    function verifyProofAndUpdateState(bytes memory proofData, uint256 publicInputsHash)
        internal
        returns (uint256 rollupId)
    {
        // Verify the rollup proof.
        //
        // We manually call the verifier contract via assembly to save on gas costs and to reduce contract bytecode size
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
                calldataload(add(add(calldataload(0x04), 0x24), sub(ROLLUP_HEADER_LENGTH, 0x18))),
                0xffffffff
            )

            // add 8 bytes to skip over the two packed params that follow the rollup header data
            // broadcastedDataSize = inner join-split pubinput size + header size
            let broadcastedDataSize := add(add(ROLLUP_HEADER_LENGTH, 8), encodedInnerDataSize)

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
            let verifierAddress := and(sload(rollupState.slot), ADDRESS_MASK)
            let proof_verified := staticcall(gas(), verifierAddress, dataPtr, add(zkProofDataSize, 0x64), 0x00, 0x00)

            // Check the proof is valid!
            if iszero(proof_verified) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }

        // Validate and update state hash
        rollupId = validateAndUpdateMerkleRoots(proofData);
    }

    /**
     * @dev Extract public inputs and validate they are inline with current contract rollupState.
     * @param proofData - Rollup proof data.
     */
    function validateAndUpdateMerkleRoots(bytes memory proofData) internal returns (uint256) {
        (
            uint256 rollupId,
            bytes32 oldStateHash,
            bytes32 newStateHash,
            uint32 numDataLeaves,
            uint32 dataStartIndex
        ) = computeRootHashes(proofData);

        bytes32 expectedStateHash = rollupStateHash;
        if (oldStateHash != expectedStateHash) {
            revert INCORRECT_STATE_HASH(oldStateHash, newStateHash);
        }

        unchecked {
            uint32 storedDataSize = rollupState.datasize;
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

            rollupStateHash = newStateHash;
            rollupState.datasize = dataStartIndex + numDataLeaves;
        }
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
        uint256 end;
        assembly {
            // add 0x20 to skip over 1st member of the bytes type (the length field).
            // Also skip over the rollup header.
            proofDataPtr := add(ROLLUP_HEADER_LENGTH, add(proofData, 0x20))

            // compute the position of proofDataPtr after we iterate through every transaction
            end := add(proofDataPtr, mul(numTxs, TX_PUBLIC_INPUT_LENGTH))
        }
        uint256 stepSize = TX_PUBLIC_INPUT_LENGTH;

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

                        bytes32 hashedMessage = RollupProcessorLibrary.getSignedMessageForTxId(digest);

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
            // don't check for overflow, would take > 2^200 iterations of this loop for that to happen!
            unchecked {
                proofDataPtr += TX_PUBLIC_INPUT_LENGTH;
            }
        }
    }

    /**
     * @dev Unpack the bridgeId into a BridgeData struct
     * @param bridgeId - Bit-array that encodes data that describes a DeFi bridge.
     *
     * Structure of the bit array is as follows (starting at least significant bit):
     * | bit range | parameter | description
     * | 0 - 32    | bridgeAddressId | The address ID. Bridge address = `supportedBridges[bridgeAddressId]`
     * | 32 - 62   | inputAssetIdA    | Input asset ID. Asset address = `supportedAssets[inputAssetIdA]`
     * | 62 - 92   | outputAssetIdA  | First output asset ID |
     * | 92 - 122  | outputAssetIdB  | Second output asset ID (if bridge has 2nd output asset) |
     * | 122 - 154 | inputAssetIdB | Second input asset ID. If virtual, is defi interaction nonce of interaction that produced the note |
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
        assembly {
            mstore(bridgeData, and(bridgeId, MASK_THIRTY_TWO_BITS)) // bridgeAddressId
            mstore(add(bridgeData, 0x40), and(shr(INPUT_ASSET_ID_A_SHIFT, bridgeId), MASK_THIRTY_BITS)) // inputAssetIdA
            mstore(add(bridgeData, 0x60), and(shr(OUTPUT_ASSET_ID_A_SHIFT, bridgeId), MASK_THIRTY_BITS)) // outputAssetIdA
            mstore(add(bridgeData, 0x80), and(shr(OUTPUT_ASSET_ID_B_SHIFT, bridgeId), MASK_THIRTY_BITS)) // outputAssetIdB
            mstore(add(bridgeData, 0xa0), and(shr(INPUT_ASSET_ID_B_SHIFT, bridgeId), MASK_THIRTY_BITS)) // inputAssetIdB
            mstore(add(bridgeData, 0xc0), and(shr(AUX_DATA_SHIFT, bridgeId), MASK_SIXTY_FOUR_BITS)) // auxData

            let bitConfig := and(shr(BITCONFIG_SHIFT, bridgeId), MASK_THIRTY_TWO_BITS)
            // bitConfig = bit mask that contains bridge ID settings
            // bit 0 = first input asset virtual?
            // bit 1 = second input asset virtual?
            // bit 2 = first output asset virtual?
            // bit 3 = second output asset virtual?
            // bit 4 = second input asset real?
            // bit 5 = second output asset real?
            mstore(add(bridgeData, 0xe0), and(bitConfig, 1)) // firstInputVirtual ((bitConfit) & 1) == 1
            mstore(add(bridgeData, 0x100), eq(and(shr(1, bitConfig), 1), 1)) // secondInputVirtual ((bitConfig >> 1) & 1) == 1
            mstore(add(bridgeData, 0x120), eq(and(shr(2, bitConfig), 1), 1)) // firstOutputVirtual ((bitConfig >> 2) & 1) == 1
            mstore(add(bridgeData, 0x140), eq(and(shr(3, bitConfig), 1), 1)) // secondOutputVirtual ((bitConfig >> 3) & 1) == 1
            mstore(add(bridgeData, 0x160), eq(and(shr(4, bitConfig), 1), 1)) // secondInputReal ((bitConfig >> 4) & 1) == 1
            mstore(add(bridgeData, 0x180), eq(and(shr(5, bitConfig), 1), 1)) // secondOutputReal ((bitConfig >> 5) & 1) == 1
        }

        // potential conflicting states that are explicitly ruled out by circuit constraints:
        if (bridgeData.secondInputReal && bridgeData.secondInputVirtual) {
            revert BRIDGE_ID_IS_INCONSISTENT();
        }
        if (bridgeData.secondOutputReal && bridgeData.secondOutputVirtual) {
            revert BRIDGE_ID_IS_INCONSISTENT();
        }
        bridgeData.bridgeAddress = supportedBridges[bridgeData.bridgeAddressId - 1];
        bool bothOutputsReal = (!bridgeData.firstOutputVirtual && bridgeData.secondOutputReal);
        bool bothOutputsVirtual = (bridgeData.firstOutputVirtual && bridgeData.secondOutputVirtual);
        if ((bothOutputsReal || bothOutputsVirtual) && (bridgeData.outputAssetIdA == bridgeData.outputAssetIdB)) {
            revert BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS(bridgeData.outputAssetIdA);
        }
        bool bothInputsReal = (!bridgeData.firstInputVirtual && bridgeData.secondInputReal);
        bool bothInputsVirtual = (bridgeData.firstInputVirtual && bridgeData.secondInputVirtual);
        if ((bothInputsReal || bothInputsVirtual) && (bridgeData.outputAssetIdA == bridgeData.outputAssetIdB)) {
            revert BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS(bridgeData.outputAssetIdA);
        }
        bridgeData.bridgeGasLimit = getBridgeGasLimit(bridgeData.bridgeAddressId);
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
        if (bridgeData.firstInputVirtual) {
            // asset id will be defi interaction nonce that created note
            inputAssetA.id = bridgeData.inputAssetIdA;
            inputAssetA.erc20Address = address(0x0);
            inputAssetA.assetType = AztecTypes.AztecAssetType.VIRTUAL;
        } else {
            inputAssetA.id = bridgeData.inputAssetIdA;
            inputAssetA.erc20Address = getSupportedAsset(bridgeData.inputAssetIdA);
            inputAssetA.assetType = inputAssetA.erc20Address == address(0x0)
                ? AztecTypes.AztecAssetType.ETH
                : AztecTypes.AztecAssetType.ERC20;
        }
        if (bridgeData.firstOutputVirtual) {
            // use nonce as asset id.
            outputAssetA.id = defiInteractionNonce;
            outputAssetA.erc20Address = address(0x0);
            outputAssetA.assetType = AztecTypes.AztecAssetType.VIRTUAL;
        } else {
            outputAssetA.id = bridgeData.outputAssetIdA;
            outputAssetA.erc20Address = getSupportedAsset(bridgeData.outputAssetIdA);
            outputAssetA.assetType = outputAssetA.erc20Address == address(0x0)
                ? AztecTypes.AztecAssetType.ETH
                : AztecTypes.AztecAssetType.ERC20;
        }

        if (bridgeData.secondInputVirtual) {
            // asset id will be defi interaction nonce that created note
            inputAssetB.id = bridgeData.inputAssetIdB;
            inputAssetB.erc20Address = address(0x0);
            inputAssetB.assetType = AztecTypes.AztecAssetType.VIRTUAL;
        } else if (bridgeData.secondInputReal) {
            inputAssetB.id = bridgeData.inputAssetIdB;
            inputAssetB.erc20Address = getSupportedAsset(bridgeData.inputAssetIdB);
            inputAssetB.assetType = inputAssetB.erc20Address == address(0x0)
                ? AztecTypes.AztecAssetType.ETH
                : AztecTypes.AztecAssetType.ERC20;
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
     * @dev Get the length of the defi interaction hashes array and the number of pending interactions
     *
     * @return defiInteractionHashesLength the complete length of the defi interaction array
     * @return numPendingInteractions the current number of pending defi interactions
     */
    function getDefiHashesLengths()
        internal
        view
        returns (uint256 defiInteractionHashesLength, uint256 numPendingInteractions)
    {
        assembly {
            // retrieve the total length of the defi interactions array and also the number of pending interactions to a maximum of NUMBER_OF_BRIDGE_CALLS
            let state := sload(rollupState.slot)
            {
                defiInteractionHashesLength := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, state))
                numPendingInteractions := defiInteractionHashesLength
                if gt(numPendingInteractions, NUMBER_OF_BRIDGE_CALLS) {
                    numPendingInteractions := NUMBER_OF_BRIDGE_CALLS
                }
            }
        }
    }

    /**
     * @dev Get the set of hashes that comprise the current pending defi interactions
     *
     * @return hashes the set of valid (i.e. non-zero) hashes that comprise the pending defi interactions
     * @return nextExpectedHash the hash of all hashes (including zero hashes) that comprise the pending defi interactions
     */
    function calculateNextExpectedDefiHash() internal view returns (bytes32[] memory hashes, bytes32 nextExpectedHash) {
        /**----------------------------------------
         * Compute nextExpectedHash
         *-----------------------------------------
         *
         * The storage slot `defiInteractionHashes` points to an array that represents the
         * set of defi interactions from previous blocks that have been resolved.
         *
         * We need to take the interaction result data from each of the above defi interactions,
         * and add that data into the Aztec L2 merkle tree that contains defi interaction results
         * (the "Defi Tree". Its merkle root is one of the inputs to the storage variable `rollupStateHash`)
         *
         * It is the rollup provider's responsibility to perform these additions.
         * In the current block being processed, the rollup provider must take these pending interaction results,
         * create commitments to each result and insert each commitment into the next empty leaf of the defi tree.
         *
         * The following code validates that this has happened! This is how:
         *
         * Part 1: What are we checking?
         *
         * The rollup circuit will receive, as a private input from the rollup provider, the pending defi interaction results
         * (`bridgeId`, `totalInputValue`, `totalOutputValueA`, `totalOutputValueB`, `result`)
         * The rollup circuit will compute the SHA256 hash of each interaction result (the defiInteractionHash)
         * Finally the SHA256 hash of `NUMBER_OF_BRIDGE_CALLS` of these defiInteractionHash values is computed.
         * (if there are fewer than `NUMBER_OF_BRIDGE_CALLS` pending defi interaction results, the SHA256 hash of an empty defi interaction result is used instead. i.e. all variable values are set to 0)
         * The above SHA256 hash, the `pendingDefiInteractionHash` is one of the broadcasted values that forms the `publicInputsHash` public input to the rollup circuit.
         * When verifying a rollup proof, this smart contract will compute `publicInputsHash` from the input calldata. The PLONK Verifier smart contract will then validate
         * that our computed value for `publicInputHash` matches the value used when generating the rollup proof.
         *
         * TLDR of the above: our proof data contains a variable `pendingDefiInteractionHash`, which is the CLAIMED VALUE of SHA256 hashing the SHA256 hashes of the defi interactions that have resolved but whose data has not yet been added into the defi tree.
         *
         * Part 2: How do we check `pendingDefiInteractionHash` is correct???
         *
         * This contract will call `DefiBridgeProxy.convert` (via delegatecall) on every new defi interaction present in the block.
         * The return values from the bridge proxy contract are used to construct a defi interaction result. Its hash is then computed
         * and stored in `defiInteractionHashes[]`.
         *
         * N.B. It's very important that DefiBridgeProxy does not call selfdestruct, or makes a delegatecall out to a contract that can selfdestruct :o
         *
         * Similarly, when async defi interactions resolve, the interaction result is stored in `asyncDefiInteractionHashes[]`. At the end of the processDefiBridges function,
         * the contents of the async array is copied into `defiInteractionHashes` (i.e. async interaction results are delayed by 1 rollup block. This is to prevent griefing attacks where
         * the rollup state changes between the time taken for a rollup tx to be constructed and the rollup tx to be mined)
         *
         * We use the contents of `defiInteractionHashes` to reconstruct `pendingDefiInteractionHash`, and validate it matches the value present in calldata and
         * therefore the value used in the rollup circuit when this block's rollup proof was constructed.
         * This validates that all of the required defi interaction results were added into the defi tree by the rollup provider
         * (the circuit logic enforces this, we just need to check the rollup provider used the correct inputs)
         */
        (uint256 defiInteractionHashesLength, uint256 numPendingInteractions) = getDefiHashesLengths();
        uint256 offset = defiInteractionHashesLength - numPendingInteractions;
        assembly {
            // allocate the output array of hashes
            hashes := mload(0x40)
            let hashData := add(hashes, 0x20)
            // update the free memory pointer to point past the end of our array
            // our array will consume 32 bytes for the length field plus NUMBER_OF_BRIDGE_BYTES for all of the hashes
            mstore(0x40, add(hashes, add(NUMBER_OF_BRIDGE_BYTES, 0x20)))
            // set the length of hashes to only include the non-zero hash values
            // although this function will write all of the hashes into our allocated memory, we only want to return the non-zero hashes
            mstore(hashes, numPendingInteractions)

            // Start by getting the defi interaction hashes array slot value
            mstore(0x00, defiInteractionHashes.slot)
            let sloadOffset := keccak256(0x00, 0x20)
            let i := 0

            // Iterate over numPendingInteractions (will be between 0 and NUMBER_OF_BRIDGE_CALLS)
            // Load defiInteractionHashes[offset + i] and store in memory
            // in order to compute SHA2 hash (nextExpectedHash)
            for {

            } lt(i, numPendingInteractions) {
                i := add(i, 0x01)
            } {
                mstore(add(hashData, mul(i, 0x20)), sload(add(sloadOffset, add(offset, i))))
            }

            // If numPendingInteractions < NUMBER_OF_BRIDGE_CALLS, continue iterating up to NUMBER_OF_BRIDGE_CALLS, this time
            // inserting the "zero hash", the result of sha256(emptyDefiInteractionResult)
            for {

            } lt(i, NUMBER_OF_BRIDGE_CALLS) {
                i := add(i, 0x01)
            } {
                mstore(add(hashData, mul(i, 0x20)), DEFI_RESULT_ZERO_HASH)
            }
            pop(staticcall(gas(), 0x2, hashData, NUMBER_OF_BRIDGE_BYTES, 0x00, 0x20))
            nextExpectedHash := mod(mload(0x00), CIRCUIT_MODULUS)
        }
    }

    /**
     * @dev Process defi interactions.
     *      1. pop NUMBER_OF_BRIDGE_CALLS (if available) interaction hashes off of `defiInteractionHashes`,
     *         validate their hash (calculated at the end of the previous rollup and stored as nextExpectedDefiInteractionsHash) equals `numPendingInteractions`
     *         (this validates that rollup block has added these interaction results into the L2 data tree)
     *      2. iterate over rollup block's new defi interactions (up to NUMBER_OF_BRIDGE_CALLS). Trigger interactions by
     *         calling DefiBridgeProxy contract. Record results in either `defiInteractionHashes` (for synchrohnous txns)
     *         or, for async txns, the `pendingDefiInteractions` mapping
     *      3. copy the contents of `asyncInteractionHashes` into `defiInteractionHashes` && clear `asyncInteractionHashes`
     *      4. calculate the next value of nextExpectedDefiInteractionsHash from the new set of defiInteractionHashes
     * @param proofData - the proof data
     * @param rollupBeneficiary - the address that should be paid any subsidy for processing a defi bridge
     * @return nextExpectedHashes - the set of non-zero hashes that comprise the current pending defi interactions
     */
    function processDefiBridges(bytes memory proofData, address rollupBeneficiary)
        internal
        returns (bytes32[] memory nextExpectedHashes)
    {
        // Verify that nextExpectedDefiInteractionsHash equals the value given in the rollup
        // Then remove the set of pending hashes
        {
            // Extract the claimed value of previousDefiInteractionHash present in the proof data
            bytes32 providedDefiInteractionsHash = extractPrevDefiInteractionHash(proofData);

            // Validate the stored interactionHash matches the value used when making the rollup proof!
            if (providedDefiInteractionsHash != prevDefiInteractionsHash) {
                revert INCORRECT_PREVIOUS_DEFI_INTERACTION_HASH(providedDefiInteractionsHash, prevDefiInteractionsHash);
            }
            (uint256 defiInteractionHashesLength, uint256 numPendingInteractions) = getDefiHashesLengths();
            // numPendingInteraction equals the number of interactions expected to be in the given rollup
            // this is the length of the defiInteractionHashes array, capped at the NUM_BRIDGE_CALLS as per the following
            // numPendingInteractions = min(defiInteractionsHashesLength, numberOfBridgeCalls)
            // Compute the offset we use to index `defiInteractionHashes[]`
            // If defiInteractionHashes.length > numberOfBridgeCalls, offset = defiInteractionhashes.length - numberOfBridgeCalls.
            // Else offset = 0
            uint256 offset = defiInteractionHashesLength - numPendingInteractions;

            assembly {
                // Update DefiInteractionHashes.length (we've reduced length by up to numberOfBridgeCalls)
                // this effectively truncates the array at offset
                let state := sload(rollupState.slot)
                let oldState := and(not(shl(DEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)
                let newState := or(oldState, shl(DEFIINTERACTIONHASHES_BIT_OFFSET, offset))
                sstore(rollupState.slot, newState)
            }
        }
        uint256 interactionNonce = getRollupId(proofData) * NUMBER_OF_BRIDGE_CALLS;

        // ### Process DefiBridge Calls
        uint256 proofDataPtr;
        uint256 defiInteractionHashesLength;
        assembly {
            proofDataPtr := add(proofData, BRIDGE_IDS_OFFSET)
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
        for (uint256 i = 0; i < NUMBER_OF_BRIDGE_CALLS; ++i) {
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
                totalInputValue := mload(add(proofDataPtr, mul(0x20, NUMBER_OF_BRIDGE_CALLS)))
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
                //          uint256 ethPaymentsSlot,
                //          address rollupBeneficary
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
                mstore(add(mPtr, 0x220), rollupBeneficiary)

                // Call the bridge proxy via delegatecall!
                // We want the proxy to share state with the rollup processor, as the proxy is the entity sending/recovering tokens from the bridge contracts.
                // We wrap this logic in a delegatecall so that if the call fails (i.e. the bridge interaction fails), we can unwind bridge-interaction specific state changes,
                // without reverting the entire transaction.
                let success := delegatecall(
                    mload(add(bridgeData, 0x1a0)), // bridgeData.gasSentToBridge
                    sload(defiBridgeProxy.slot),
                    sub(mPtr, 0x04),
                    0x244,
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
                    // If the call failed, mark this interaction as failed. No tokens have been exchanged, users can
                    // use the "claim" circuit to recover the initial tokens they sent to the bridge
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
                // if interaction is Async, update pendingDefiInteractions
                // if interaction is synchronous, compute the interaction hash and add to defiInteractionHashes
                switch mload(add(bridgeResult, 0x40)) // switch isAsync
                case 1 {
                    let mPtr := mload(0x40)
                    // emit AsyncDefiBridgeProcessed(indexed bridgeId, indexed interactionNonce, totalInputValue)
                    {
                        mstore(mPtr, totalInputValue)
                        log3(mPtr, 0x20, ASYNC_BRIDGE_PROCESSED_SIGHASH, bridgeId, interactionNonce)
                    }
                    // pendingDefiInteractions[interactionNonce] = PendingDefiBridgeInteraction(bridgeId, totalInputValue, 0)
                    mstore(0x00, interactionNonce)
                    mstore(0x20, pendingDefiInteractions.slot)
                    let pendingDefiInteractionsSlotBase := keccak256(0x00, 0x40)

                    sstore(pendingDefiInteractionsSlotBase, bridgeId)
                    sstore(add(pendingDefiInteractionsSlotBase, 0x01), totalInputValue)
                }
                default {
                    let mPtr := mload(0x40)
                    // prepare the data required to publish the DefiBridgeProcessed event, we will only publish it if isAsync == false
                    // async interactions that have failed, have their isAsync property modified to false above
                    // emit DefiBridgeProcessed(indexed bridgeId, indexed interactionNonce, totalInputValue, outputValueA, outputValueB, success)
                    {
                        mstore(mPtr, totalInputValue)
                        mstore(add(mPtr, 0x20), mload(bridgeResult)) // outputValueA
                        mstore(add(mPtr, 0x40), mload(add(bridgeResult, 0x20))) // outputValueB
                        mstore(add(mPtr, 0x60), mload(add(bridgeResult, 0x60))) // success
                        log3(mPtr, 0x80, DEFI_BRIDGE_PROCESSED_SIGHASH, bridgeId, interactionNonce)
                    }
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
            let arrayOverflow := gt(
                add(asyncDefiInteractionHashesLength, defiInteractionHashesLength),
                ARRAY_LENGTH_MASK
            )

            // Throw an error if defiInteractionHashesLength > ARRAY_LENGTH_MASK (i.e. is >= 1024)
            // should never hit this! If block `i` generates synchronous txns,
            // block 'i + 1' must process them.
            // Only way this array size hits 1024 is if we produce a glut of async interaction results
            // between blocks. HOWEVER we ensure that async interaction callbacks fail iff they would increase
            // defiInteractionHashes length to be >= 512
            // Still, can't hurt to check...
            if arrayOverflow {
                // keccak256("ARRAY_OVERFLOW()")
                mstore(0x00, 0x58a4ab0e00000000000000000000000000000000000000000000000000000000)
                revert(0x00, 0x04)
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

        // now we want to extract the next set of pending defi interaction hashes and calculate their hash to store for the next rollup
        (bytes32[] memory hashes, bytes32 nextExpectedHash) = calculateNextExpectedDefiHash();
        nextExpectedHashes = hashes;
        prevDefiInteractionsHash = nextExpectedHash;
    }

    /**
     * @dev Process asyncdefi interactions.
     *      Callback function for asynchronous bridge interactions.
     * @param interactionNonce - unique id of the interaection
     */
    function processAsyncDefiInteraction(uint256 interactionNonce) external override returns (bool) {
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
            bridgeContract := and(bridgeContract, ADDRESS_MASK)
        }
        if (address(bridgeContract) == address(0)) {
            revert INVALID_BRIDGE_ADDRESS();
        }
        // Copy some variables to front of stack to get around stack too deep errors
        InteractionInputs memory inputs = InteractionInputs(
            totalInputValue,
            interactionNonce,
            uint64(bridgeData.auxData)
        );
        (uint256 outputValueA, uint256 outputValueB, bool interactionCompleted) = bridgeContract.finalise(
            inputAssetA,
            inputAssetB,
            outputAssetA,
            outputAssetB,
            inputs.interactionNonce,
            inputs.auxData
        );

        if (!interactionCompleted) {
            // clear the re-entrancy mutex if it was false at the start of this function
            if (!startingMutexValue) {
                clearReentrancyMutex();
            }
            return false;
        }

        // delete pendingDefiInteractions[interactionNonce]
        // N.B. only need to delete 1st slot value `bridgeId`. Deleting vars costs gas post-London
        // setting bridgeId to 0 is enough to cause future calls with this interaction nonce to fail
        pendingDefiInteractions[inputs.interactionNonce].bridgeId = 0;

        if (outputValueB > 0 && outputAssetB.assetType == AztecTypes.AztecAssetType.NOT_USED) {
            revert NONZERO_OUTPUT_VALUE_ON_NOT_USED_ASSET(outputValueB);
        }

        if (outputValueA == 0 && outputValueB == 0) {
            // issue refund.
            transferTokensAsync(address(bridgeContract), inputAssetA, inputs.totalInputValue, inputs.interactionNonce);
        } else {
            // transfer output tokens to rollup contract
            transferTokensAsync(address(bridgeContract), outputAssetA, outputValueA, inputs.interactionNonce);
            transferTokensAsync(address(bridgeContract), outputAssetB, outputValueB, inputs.interactionNonce);
        }

        // compute defiInteractionHash and push it onto the asyncDefiInteractionHashes array
        bool result;
        assembly {
            let inputValue := mload(inputs)
            let nonce := mload(add(inputs, 0x20))
            result := iszero(and(eq(outputValueA, 0), eq(outputValueB, 0)))
            let mPtr := mload(0x40)
            mstore(mPtr, bridgeId)
            mstore(add(mPtr, 0x20), nonce)
            mstore(add(mPtr, 0x40), inputValue)
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
        emit DefiBridgeProcessed(
            bridgeId,
            inputs.interactionNonce,
            inputs.totalInputValue,
            outputValueA,
            outputValueB,
            result
        );

        // clear the re-entrancy mutex if it was false at the start of this function
        if (!startingMutexValue) {
            clearReentrancyMutex();
        }
        return true;
    }

    /**
     * @dev Token transfer method used by processAsyncDefiInteraction
     * Calls `transferFrom` on the target erc20 token, if asset is of type ERC
     * If asset is ETH, we validate a payment has been made against the provided interaction nonce
     * @param bridgeContract address of bridge contract we're taking tokens from
     * @param asset the AztecAsset being transferred
     * @param outputValue the expected value transferred
     * @param interactionNonce the defi interaction nonce of the interaction
     */
    function transferTokensAsync(
        address bridgeContract,
        AztecTypes.AztecAsset memory asset,
        uint256 outputValue,
        uint256 interactionNonce
    ) internal {
        if (asset.assetType == AztecTypes.AztecAssetType.ETH) {
            if (outputValue > ethPayments[interactionNonce]) {
                revert INSUFFICIENT_ETH_TRANSFER();
            }
            ethPayments[interactionNonce] = 0;
        } else if (asset.assetType == AztecTypes.AztecAssetType.ERC20 && outputValue > 0) {
            address tokenAddress = asset.erc20Address;
            TokenTransfers.safeTransferFrom(tokenAddress, bridgeContract, address(this), outputValue);
        }
    }

    /**
     * @dev Transfer a fee to the feeReceiver
     * @param proofData proof of knowledge of a rollup block update
     * @param feeReceiver fee beneficiary as described kby the rollup provider
     */
    function transferFee(bytes memory proofData, address feeReceiver) internal {
        for (uint256 i = 0; i < NUMBER_OF_ASSETS; ++i) {
            uint256 assetId = extractAssetId(proofData, i);
            uint256 txFee = extractTotalTxFee(proofData, i);
            if (txFee > 0) {
                if (assetId == ethAssetId) {
                    // We explicitly do not throw if this call fails, as this opens up the possiblity of
                    // griefing attacks, as engineering a failed fee will invalidate an entire rollup block
                    assembly {
                        pop(call(50000, feeReceiver, txFee, 0, 0, 0, 0))
                    }
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
            assembly {
                pop(call(30000, receiverAddress, withdrawValue, 0, 0, 0, 0))
            }
            // payable(receiverAddress).call{gas: 30000, value: withdrawValue}('');
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

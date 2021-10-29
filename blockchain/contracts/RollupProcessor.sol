// SPDX-License-Identifier: Apache-2.0
// Copyright 2021 Spilsbury Holdings Ltd.
pragma solidity >=0.6.10;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/utils/Pausable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {IVerifier} from './interfaces/IVerifier.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';
import {IFeeDistributor} from './interfaces/IFeeDistributor.sol';
import {IERC20Permit} from './interfaces/IERC20Permit.sol';
import {Decoder} from './Decoder.sol';
import './libraries/RollupProcessorLibrary.sol';
import {Error} from './Error.sol';

/**
 * @title Rollup Processor
 * @dev Smart contract responsible for processing Aztec zkRollups, including relaying them to a verifier
 * contract for validation and performing all relevant ERC20 token transfers
 */
contract RollupProcessor is IRollupProcessor, Decoder, Ownable, Pausable {
    using SafeMath for uint256;

    bytes4 private constant DEFI_BRIDGE_PROXY_CONVERT_SELECTOR = 0xb5f08153; // bytes4(keccak256('convert(address,address,address,address,uint32,uint256,uint256,uint256)'));
    bytes4 private constant TRANSFER_FROM_SELECTOR = 0x23b872dd; // bytes4(keccak256('transferFrom(address,address,uint256)'));
    bytes32 private constant INIT_DATA_ROOT = 0x11977941a807ca96cf02d1b15830a53296170bf8ac7d96e5cded7615d18ec607;
    bytes32 private constant INIT_NULL_ROOT = 0x1b831fad9b940f7d02feae1e9824c963ae45b3223e721138c6f73261e690c96a;
    bytes32 private constant INIT_ROOT_ROOT = 0x1b435f036fc17f4cc3862f961a8644839900a8e4f1d0b318a7046dd88b10be75;
    bytes32 private constant INIT_DEFI_ROOT = 0x0170467ae338aaf3fd093965165b8636446f09eeb15ab3d36df2e31dd718883d;

    IVerifier public verifier;

    uint256 public immutable escapeBlockLowerBound;
    uint256 public immutable escapeBlockUpperBound;

    event RollupProcessed(uint256 indexed rollupId);

    bytes32 private constant DEFI_BRIDGE_PROCESSED_SIGHASH = 0x1ccb5390975e3d07503983a09c3b6a5d11a0e40c4cb4094a7187655f643ef7b4;
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
    event AssetAdded(uint256 indexed assetId, address indexed assetAddress);
    event BridgeAdded(uint256 indexed bridgeAddressId, address indexed bridgeAddress);
    event RollupProviderUpdated(address indexed providerAddress, bool valid);
    event VerifierUpdated(address indexed verifierAddress);

    // Array of supported ERC20 token address.
    address[] public supportedAssets;

    // Mapping which maps an asset address to a bool, determining whether it supports
    // permit as according to ERC-2612
    mapping(address => bool) assetPermitSupport;

    // Array of supported bridge contract addresses (similar to assetIds)
    address[] public supportedBridges;

    // Mapping from assetId to mapping of userAddress to public userBalance stored on this contract
    mapping(uint256 => mapping(address => uint256)) public userPendingDeposits;

    mapping(address => mapping(bytes32 => bool)) public depositProofApprovals;

    mapping(address => bool) public rollupProviders;

    address public override defiBridgeProxy;

    address public override feeDistributor;

    // We need to cap the amount of gas sent to the DeFi bridge contract for two reasons.
    // 1: To provide consistency to rollup providers around costs.
    // 2: To prevent griefing attacks where a bridge consumes all our gas.
    uint256 private gasSentToBridgeProxy = 300000;
    struct PendingDefiBridgeInteraction
    {
        uint256 bridgeId;
        uint256 totalInputValueA;
        uint256 totalInputValueB;
    }
    // map defiInteractionNonce to PendingDefiBridgeInteraction
    mapping(uint256 => PendingDefiBridgeInteraction) pendingDefiInteractions;

    /**
     * rollupState storage slot contains the following data:
     *
     * | bit offset   | num bits    | description |
     * | 0             | 202           | rollup state hash |
     * | 202            | 32            | datasize: number of filled entries in note tree |
     * | 235            | 10            | asyncDefiInteractionHashes.length : number of entries in asyncDefiInteractionHashes array |
     * | 245            | 10            | defiInteractionHashes.length : number of entries in defiInteractionHashes array |
     * | 255            | 1             | reentrancyMutex used to guard against reentrancy attacks
     */
    bytes32 public rollupState =
        bytes32(
            uint256(
                keccak256(
                    abi.encodePacked(
                        uint256(0), // nextRollupId
                        INIT_DATA_ROOT,
                        INIT_NULL_ROOT,
                        INIT_ROOT_ROOT,
                        INIT_DEFI_ROOT
                    )
                )
            ) & STATE_HASH_MASK
        );

    function getStateHash() public view returns (bytes32 stateHash) {
        assembly {
            stateHash := and(STATE_HASH_MASK, sload(rollupState_slot))
        }
    }

    function getDataSize() public view returns (uint256 dataSize) {
        assembly {
            dataSize := and(DATASIZE_MASK, shr(DATASIZE_BIT_OFFSET, sload(rollupState_slot)))
        }
    }

    function setStateHash(bytes32 newStateHash) internal {
        assembly {
            let oldState := and(not(STATE_HASH_MASK), sload(rollupState_slot))
            let updatedState := or(oldState, and(newStateHash, STATE_HASH_MASK))
            sstore(rollupState_slot, updatedState)
        }
    }

    function setDataSize(uint256 newDataSize) internal {
        assembly {
            let oldState := and(not(shl(DATASIZE_BIT_OFFSET, DATASIZE_MASK)), sload(rollupState_slot))
            let updatedState := or(oldState, shl(DATASIZE_BIT_OFFSET, and(newDataSize, DATASIZE_MASK)))
            sstore(rollupState_slot, updatedState)
        }
    }

    function setReentrancyMutex() internal {
        assembly {
            let oldState := sload(rollupState_slot)
            let updatedState := or(shl(REENTRANCY_MUTEX_BIT_OFFSET, 1), oldState)
            sstore(rollupState_slot, updatedState)
        }
    }

    function clearReentrancyMutex() internal {
        assembly {
            let oldState := sload(rollupState_slot)
            let updatedState := and(not(shl(REENTRANCY_MUTEX_BIT_OFFSET, 1)), oldState)
            sstore(rollupState_slot, updatedState)
        }
    }

    function reentrancyMutexCheck() internal {
        bool mutexValue;
        assembly {
            mutexValue := shr(REENTRANCY_MUTEX_BIT_OFFSET, sload(rollupState_slot))
        }
        require(mutexValue == false, 'REENTRANCY MUTEX IS SET');
    }

    function getDefiInteractionHashesLength() internal view returns (uint256 res) {
        assembly {
            res := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, sload(rollupState_slot)))
        }
    }

    function getAsyncDefiInteractionHashesLength() internal view returns (uint256 res) {
        assembly {
            res := and(ARRAY_LENGTH_MASK, shr(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, sload(rollupState_slot)))
        }
    }

    /**
     * asyncDefiInteractionHashes and defiInteractionHashes are custom implementations of an array type!!
     *
     * we store the length fields for each array inside the `rollupState` storage slot
     * we access array elements in the traditional manner: array_slot[i] = keccak256(array_slot + i)
     * this reduces the number of storage slots we write to when processing a rollup
     * (each slot costs 5,000 gas to update. Repeated modifications to the same slot in a tx only cost 100 gas after the first)
     */
    bytes32 internal asyncDefiInteractionHashes; // defi interaction hashes to be transferred into pending defi interaction hashes
    bytes32 internal defiInteractionHashes;

    receive() external payable {}

    constructor(
        address _verifierAddress,
        uint256 _escapeBlockLowerBound,
        uint256 _escapeBlockUpperBound,
        address _defiBridgeProxy,
        address _contractOwner
    ) public {
        verifier = IVerifier(_verifierAddress);
        defiBridgeProxy = _defiBridgeProxy;
        escapeBlockLowerBound = _escapeBlockLowerBound;
        escapeBlockUpperBound = _escapeBlockUpperBound;
        rollupProviders[msg.sender] = true;
        transferOwnership(_contractOwner);
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

    function setFeeDistributor(address feeDistributorAddress) public override onlyOwner {
        feeDistributor = feeDistributorAddress;
    }

    function setGasSentToDefiBridgeProxy(uint256 _gasSentToBridgeProxy) public override onlyOwner {
        gasSentToBridgeProxy = _gasSentToBridgeProxy;
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
        if (assetId == ethAssetId) {
            return address(0x0);
        }

        address result = supportedAssets[assetId - 1];
        require(result != address(0), 'Rollup Processor: INVALID_ASSET_ADDRESS');
        return result;
    }

    /**
     * @dev Get the bridge contract address for a given bridgeAddressId
     * @param bridgeAddressId - identifier used to denote a particular bridge
     */
    function getSupportedBridge(uint256 bridgeAddressId) public view override returns (address) {
        return supportedBridges[bridgeAddressId - 1];
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
            mstore(0x00, defiInteractionHashes_slot)
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
            mstore(0x00, asyncDefiInteractionHashes_slot)
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
    function getAssetPermitSupport(uint256 assetId) external view override returns (bool) {
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
        uint256 userBalance = userPendingDeposits[assetId][transferFromAddress];
        require(userBalance >= amount, 'Rollup Processor: INSUFFICIENT_DEPOSIT');

        userPendingDeposits[assetId][transferFromAddress] = userBalance.sub(amount);
    }

    /**
     * @dev Set the mapping between an assetId and the address of the linked asset.
     * Protected by onlyOwner
     * @param linkedToken - address of the asset
     * @param supportsPermit - bool determining whether this supports permit
     */
    function setSupportedAsset(address linkedToken, bool supportsPermit) external override onlyOwner {
        require(linkedToken != address(0x0), 'Rollup Processor: ZERO_ADDRESS');

        supportedAssets.push(linkedToken);
        assetPermitSupport[linkedToken] = supportsPermit;

        uint256 assetId = supportedAssets.length;
        emit AssetAdded(assetId, linkedToken);
    }

    /**
     * @dev Set the mapping between an bridge contract id and the address of the linked bridge contract.
     * Protected by onlyOwner
     * @param linkedBridge - address of the bridge contract
     */
    function setSupportedBridge(address linkedBridge) external override onlyOwner {
        require(linkedBridge != address(0x0), 'Rollup Processor: ZERO_ADDRESS');

        supportedBridges.push(linkedBridge);

        uint256 bridgeAddressId = supportedBridges.length;

        emit BridgeAdded(bridgeAddressId, linkedBridge);
    }

    /**
     * @dev Update the value indicating whether a linked asset supports permit.
     * Protected by onlyOwner
     * @param assetId - unique ID of the asset
     * @param supportsPermit - bool determining whether this supports permit
     */
    function setAssetPermitSupport(uint256 assetId, bool supportsPermit) external override onlyOwner {
        address assetAddress = getSupportedAsset(assetId);
        require(assetAddress != address(0x0), 'Rollup Processor: TOKEN_ASSET_NOT_LINKED');

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
        reentrancyMutexCheck();

        if (assetId == ethAssetId) {
            require(msg.value == amount, 'Rollup Processor: WRONG_AMOUNT');
            increasePendingDepositBalance(assetId, depositorAddress, amount);
        } else {
            require(msg.value == 0, 'Rollup Processor: WRONG_PAYMENT_TYPE');

            address assetAddress = getSupportedAsset(assetId);
            internalDeposit(assetId, assetAddress, depositorAddress, amount);
        }
        
        if(proofHash != 0)  {
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
        address assetAddress = getSupportedAsset(assetId);
        IERC20Permit(assetAddress).permit(depositorAddress, spender, permitApprovalAmount, deadline, v, r, s);
        internalDeposit(assetId, assetAddress, depositorAddress, amount);

        if(proofHash != '')  {
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
        // check user approved contract to transfer funds, so can throw helpful error to user
        uint256 rollupAllowance = IERC20(assetAddress).allowance(depositorAddress, address(this));
        require(rollupAllowance >= amount, 'Rollup Processor: INSUFFICIENT_TOKEN_APPROVAL');

        IERC20(assetAddress).transferFrom(depositorAddress, address(this), amount);
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
    function escapeHatch(
        bytes calldata, /* encodedProofData */
        bytes calldata signatures,
        bytes calldata /* offchainTxData */
    ) external override whenNotPaused {
        reentrancyMutexCheck();
        setReentrancyMutex();
        (bool isOpen, ) = getEscapeHatchStatus();
        require(isOpen, 'Rollup Processor: ESCAPE_BLOCK_RANGE_INCORRECT');

        (bytes memory proofData, uint256 numTxs, uint256 publicInputsHash) =
            decodeProof(rollupHeaderInputLength, txNumPubInputs);
        processRollupProof(proofData, signatures, numTxs, publicInputsHash);
        clearReentrancyMutex();
    }

    function processRollup(
        bytes calldata, /* encodedProofData */
        bytes calldata signatures,
        bytes calldata, /* offchainTxData */
        bytes calldata providerSignature,
        address provider,
        address payable feeReceiver,
        uint256 feeLimit
    ) external override whenNotPaused {
        reentrancyMutexCheck();
        setReentrancyMutex();
        uint256 initialGas = gasleft();

        require(rollupProviders[provider], 'Rollup Processor: UNKNOWN_PROVIDER');

        (bytes memory proofData, uint256 numTxs, uint256 publicInputsHash) =
            decodeProof(rollupHeaderInputLength, txNumPubInputs);

        {
            bytes32 digest;
            uint256 headerSize = rollupHeaderInputLength;
            assembly {
                let ptr := add(proofData, add(headerSize, 0x20))
                let tmp0 := mload(ptr)
                let tmp1 := mload(add(ptr, 0x20))
                let tmp2 := mload(add(ptr, 0x40))

                mstore(ptr, shl(0x60, feeReceiver))
                mstore(add(ptr, 0x14), feeLimit)
                mstore(add(ptr, 0x34), shl(0x60, sload(feeDistributor_slot)))

                digest := keccak256(add(proofData, 0x20), add(headerSize, 0x48))

                mstore(ptr, tmp0)
                mstore(add(ptr, 0x20), tmp1)
                mstore(add(ptr, 0x40), tmp2)
            }
            RollupProcessorLibrary.validateSignature(digest, providerSignature, provider);
        }
        processRollupProof(proofData, signatures, numTxs, publicInputsHash);

        transferFee(proofData);

        (bool success, ) =
            feeDistributor.call(
                abi.encodeWithSignature(
                    'reimburseGas(uint256,uint256,address)',
                    initialGas - gasleft(),
                    feeLimit,
                    feeReceiver
                )
            );
        require(success, 'Rollup Processor: REIMBURSE_GAS_FAILED');
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
        uint256 broadcastedDataSize = rollupHeaderInputLength + 4;
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
            // The calldata param *after* the header is the length of the pub inputs array. However it is a packed 4-byte param.
            // To extract it, we subtract 28 bytes from the calldata pointer and mask off all but the 4 least significant bytes.
            let encodedInnerDataSize := and(
                calldataload(add(add(calldataload(0x04), 0x24), sub(rollupHeaderInputLengthLocal, 0x1c))),
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

            // We call the function `verify(bytes,uint256,uint256)`
            // The function signature is 0x198e744a
            // Calldata map is:
            // 0x00 - 0x04 : 0x198e744a
            // 0x04 - 0x24 : 0x40 (number of bytes between 0x04 and the start of the `proofData` array at 0x44)
            // 0x24 - 0x44 : numTxs
            // 0x44 - .... : proofData
            mstore8(dataPtr, 0x19)
            mstore8(add(dataPtr, 0x01), 0x8e)
            mstore8(add(dataPtr, 0x02), 0x74)
            mstore8(add(dataPtr, 0x03), 0x4a)
            mstore(add(dataPtr, 0x04), 0x60)
            mstore(add(dataPtr, 0x24), calldataload(add(calldataload(0x04), 0x44))) // numTxs
            mstore(add(dataPtr, 0x44), publicInputsHash) // computed SHA256 hash of broadcasted data
            mstore(add(dataPtr, 0x64), zkProofDataSize) // length of zkProofData bytes array
            calldatacopy(add(dataPtr, 0x84), zkProofDataPtr, zkProofDataSize) // copy the zk proof data into memory

            // Step 3: Call our verifier contract. If does not return any values, but will throw an error if the proof is not valid
            // i.e. verified == false if proof is not valid
            proof_verified := staticcall(gas(), sload(verifier_slot), dataPtr, add(zkProofDataSize, 0x84), 0x00, 0x00)
        }

        // Check the proof is valid!
        require(proof_verified, 'proof verification failed');

        // Validate and update state hash
        uint256 rollupId = validateAndUpdateMerkleRoots(proofData);

        emit RollupProcessed(rollupId);
    }

    /**
     * @dev Extract public inputs and validate they are inline with current contract state.
     * @param proofData - Rollup proof data.
     */
    function validateAndUpdateMerkleRoots(bytes memory proofData) internal returns (uint256) {
        (uint256 rollupId, bytes32 oldStateHash, bytes32 newStateHash, uint256 numDataLeaves, uint256 dataStartIndex) =
            computeRootHashes(proofData);

        bytes32 expectedStateHash = getStateHash();
        require(oldStateHash == expectedStateHash, 'Rollup Processor: INCORRECT_STATE_HASH');

        uint256 storedDataSize = getDataSize();
        // Ensure we are inserting at the next subtree boundary.
        if (storedDataSize % numDataLeaves == 0) {
            require(dataStartIndex == storedDataSize, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        } else {
            uint256 expected = storedDataSize + numDataLeaves - (storedDataSize % numDataLeaves);
            require(dataStartIndex == expected, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
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
                            mstore(add(mPtr, 32), "\x19Ethereum Signed Message:\n174")
                            mstore(add(mPtr, 61), "Signing this message will allow ")
                            mstore(add(mPtr, 93), "your pending funds to be spent i")
                            mstore(add(mPtr, 125), "n Aztec transaction:\n")
                            mstore(add(mPtr, 146), digest)
                            mstore(add(mPtr, 178), "\nIMPORTANT: Only sign the messag")
                            mstore(add(mPtr, 210), "e if you trust the client")
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
        // pop off 4 defi interactions from defiInteractionHashes && SHA2 them
        {
            bytes32 expectedDefiInteractionHash;
            assembly {
                // Compute the offset we use to index `defiInteractionHashes[]`
                // If defiInteractionHashes.length > 4, offset = defiInteractionhashes.length - 4
                // Else offset = 0
                let numPendingInteractions
                let offset
                let state := sload(rollupState_slot)
                {
                    let defiInteractionHashesLength := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, state))
                    numPendingInteractions := defiInteractionHashesLength
                    if gt(numPendingInteractions, numberOfBridgeCalls)
                    {
                        numPendingInteractions := numberOfBridgeCalls
                    }
                    offset := sub(defiInteractionHashesLength, numPendingInteractions)
                }

                mstore(0x00, defiInteractionHashes_slot)
                let sloadOffset := keccak256(0x00, 0x20)
                let mPtr := mload(0x40)
                let i := 0

                // Iterate over numPendingInteractions (will be between 0 and 4)
                // Load defiInteractionHashes[offset + i] and store in memory
                // in order to compute SHA2 hash (expectedDefiInteractionHash)
                for {

                } lt(i, numPendingInteractions) {
                    i := add(i, 0x01)
                } {
                    mstore(add(mPtr, mul(i, 0x20)), sload(add(sloadOffset, add(offset, i))))
                }

                // If numPendingInteractions < 4, continue iterating up to 4, this time
                // inserting the "zero hash", the result of sha256(emptyDefiInteractionResult)
                for {

                } lt(i, numberOfBridgeCalls) {
                    i := add(i, 0x01)
                } {
                    mstore(add(mPtr, mul(i, 0x20)), 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4)
                }
                pop(staticcall(gas(), 0x2, mPtr, 0x80, 0x00, 0x20))
                expectedDefiInteractionHash := mod(mload(0x00), CIRCUIT_MODULUS)

                // Update DefiInteractionHashes.length (we've reduced length by up to 4)
                let oldState := and(not(shl(DEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)
                let newState := or(oldState, shl(DEFIINTERACTIONHASHES_BIT_OFFSET, offset))
                sstore(rollupState_slot, newState)
            }
        

            bytes32 prevDefiInteractionHash = extractPrevDefiInteractionHash(proofData, rollupHeaderInputLength);

            // Validate the compupted interactionHash matches the value in the rollup proof!
            require(
                prevDefiInteractionHash == expectedDefiInteractionHash,
                'Rollup Processor: INCORRECT_PREV_DEFI_INTERACTION_HASH'
            );

        }
        uint256 interactionNonce = getRollupId(proofData) * numberOfBridgeCalls;

        /**
         * Process DeFi bridge calls
         */
        assembly {
            // Initialize variables...
            // We need defiInteractionHashes.length
            // and proofDataPtr (location in memory where our DefiInteraction data is stored, extracted from the rollup proof)
            let proofDataPtr := add(proofData, bridgeIdsOffset)
            let defiInteractionHashesLength
            {
                mstore(0x00, defiInteractionHashes_slot)
                let slotBase := keccak256(0x00, 0x20)
                // length variable for defiInteractionHashes is stored inside rollupState variable! Reduces number of unique sload/sstore locations (saves gas)
                let state := sload(rollupState_slot)
                defiInteractionHashesLength := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, state))
            }

            // Iterate over the number of bridge calls
            for { let i := 0 } lt(i, numberOfBridgeCalls) { i := add(i, 0x01) }
            {
                let bridgeId := mload(proofDataPtr)
                // If the bridgeId is zero, we have no more bridge calls to make, exit this loop!
                if iszero(bridgeId)
                {
                    break
                }

                // Extract total input value from the proofData. Validate is > 0.
                let totalInputValue := mload(add(proofDataPtr, mul(0x20, numberOfBridgeCalls)))
                if iszero(totalInputValue)
                {
                    let x := mload(0x40)
                    mstore(x, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                    mstore(add(x, 0x04), 0x20)
                    mstore(add(x, 0x24), 40)
                    mstore(add(x, 0x44), "Rollup Processor: ZERO_TOTAL_INP")
                    mstore(add(x, 0x64), "UT_VALUE")
                    revert(x, 0x84)
                }

                // extract bitConfig, inputAssetId and two outputAssetIds from bridgeId
                let bridgeAddressId := and(bridgeId, 0xffffffff)
                let bitConfig := and(shr(154, bridgeId), 0xff)
                let assetIdA := and(shr(32, bridgeId), 0x3fffffff)
                let assetIdB := and(shr(62, bridgeId), 0x3fffffff)
                let assetIdC := mul(and(bitConfig, 1), and(shr(92, bridgeId), 0x3fffffff))

                // Validate bridgeId is correctly formatted
                // i.e. if secondAssetValid is 1, both output asset ids cannot match one another
                {
                    let validBridgeId := iszero(and(eq(assetIdB, assetIdC), and(bitConfig, 1)))
                    if iszero(validBridgeId)
                    {
                        mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                        mstore(0x04, 0x20)
                        mstore(0x24, 0x20)
                        mstore(0x44, "Rollup Processor: INVALID_BRIDGE")
                        revert(0x00, 0x64)
                    }
                }

                // convert our three asset IDs into contract addresses
                // (store in same variable to reduce number of vars on stack)
                mstore(0x00, supportedAssets_slot)
                let assetSlot := keccak256(0x00, 0x20)

                if sub(assetIdA, ethAssetId)
                {
                    assetIdA := sload(add(assetSlot, sub(assetIdA, 0x01)))
                    if iszero(assetIdA)
                    {
                        revert(0x00, 0x00)
                    }
                }
                if sub(assetIdB, ethAssetId)
                {
                    assetIdB := sload(add(assetSlot, sub(assetIdB, 0x01)))
                    if iszero(assetIdB)
                    {
                        revert(0x00, 0x00)
                    }
                }
                if sub(assetIdC, ethAssetId)
                {
                    assetIdC := sload(add(assetSlot, sub(assetIdC, 0x01)))
                    if iszero(assetIdC)
                    {
                        revert(0x00, 0x00)
                    }
                }

                // convert the bridgeAddressId into contract address
                mstore(0x00, supportedBridges_slot)
                let bridgeSlot := keccak256(0x00, 0x20)

                if sub(bridgeAddressId, ethAssetId)
                {
                    bridgeAddressId := sload(add(bridgeSlot, sub(bridgeAddressId, 0x01)))
                    if iszero(bridgeAddressId)
                    {
                        revert(0x00, 0x00)
                    }
                }

                // call Bridge.convert(assetIdA, assetIdB, assetIdC, secondAssetValid, totalInputValue, interactionNonce)
                let mPtr := mload(0x40)

                let outputValueA := 0
                let outputValueB := 0
                let isAsync
        
                mstore(mPtr, DEFI_BRIDGE_PROXY_CONVERT_SELECTOR)
                mstore(add(mPtr, 0x4), bridgeAddressId)
                mstore(add(mPtr, 0x24), assetIdA)
                mstore(add(mPtr, 0x44), assetIdB)
                mstore(add(mPtr, 0x64), assetIdC)
                mstore(add(mPtr, 0x84), and(shr(122, bridgeId), 0xffffffff)) // openingNonce
                mstore(add(mPtr, 0xa4), totalInputValue)
                mstore(add(mPtr, 0xc4), interactionNonce)
                mstore(add(mPtr, 0xe4), and(shr(154, bridgeId), 0xffffffffffffffffffffffff)) // (auxData || bitConfig)
                let success := delegatecall(sload(gasSentToBridgeProxy_slot), sload(defiBridgeProxy_slot), mPtr, 0x114, mPtr, 0x60)
                if success {
                    outputValueA := mload(mPtr)
                    outputValueB := mul(mload(add(mPtr, 0x20)), and(bitConfig, 1))
                    isAsync := mload(add(mPtr, 0x40))
                }

                // emit DefiBridgeProcessed(indexed bridgeId, indexed interactionNonce, totalInputValue, outputValueA, outputValueB, success)
                {
                    mstore(mPtr, totalInputValue)
                    mstore(add(mPtr, 0x20), outputValueA)
                    mstore(add(mPtr, 0x40), outputValueB)
                    mstore(add(mPtr, 0x60), success)
                    log3(mPtr, 0x80, DEFI_BRIDGE_PROCESSED_SIGHASH, bridgeId, interactionNonce)
                }

                // if interaction is Async, update pendingDefiInteractions
                // if interaction is synchronous, compute the interaction hash and add to defiInteractionHashes
                switch isAsync
                case 1 {
                    // pendingDefiInteractions[interactionNonce] = PendingDefiBridgeInteraction(bridgeId, totalInputValue, 0)
                    mstore(0x00, interactionNonce)
                    mstore(0x20, pendingDefiInteractions_slot)
                    let pendingDefiInteractionsSlotBase := keccak256(0x00, 0x40)
                    sstore(pendingDefiInteractionsSlotBase, bridgeId)
                    sstore(add(pendingDefiInteractionsSlotBase, 0x01), totalInputValue)
                    sstore(add(pendingDefiInteractionsSlotBase, 0x02), 0) // TODO REMOVE
                }
                default {
                    // compute defiInteractionnHash
                    mstore(mPtr, bridgeId)
                    mstore(add(mPtr, 0x20), interactionNonce)
                    mstore(add(mPtr, 0x40), totalInputValue)
                    mstore(add(mPtr, 0x60), outputValueA)
                    mstore(add(mPtr, 0x80), outputValueB)
                    mstore(add(mPtr, 0xa0), success)
                    pop(staticcall(gas(), 0x2, mPtr, 0xc0, 0x00, 0x20))
                    let defiInteractionHash := mod(mload(0x00), CIRCUIT_MODULUS)

                    // defiInteractionHashes.push(defiInteractionHash) (don't update length, will do this outside of loop)
                    // reentrancy attacks that modify defiInteractionHashes array should be ruled out because of reentrancyMutex
                    mstore(0x00, defiInteractionHashes_slot)
                    sstore(add(keccak256(0x00, 0x20), defiInteractionHashesLength), defiInteractionHash)
                    defiInteractionHashesLength := add(defiInteractionHashesLength, 0x01)
                }

                // advance interactionNonce and proofDataPtr
                interactionNonce := add(interactionNonce, 0x01)
                proofDataPtr := add(proofDataPtr, 0x20)
            }

            /**
            * Cleanup
            *
            * 1. Copy asyncDefiInteractionHashes into defiInteractionHashes
            * 2. Update defiInteractionHashes.length
            * 2. Clear asyncDefiInteractionHashes.length
            * 3. Clear reentrancyMutex
            */
            let state := sload(rollupState_slot)

            let asyncDefiInteractionHashesLength := and(
                ARRAY_LENGTH_MASK,
                shr(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, state)
            )

            // Validate we are not overflowing our 1024 array size
            // Actually check against a max array size of 1019
            // (this is to more easily test this failure condition!)
            // (can set the array length to max of 1023, send a rollup
            //  proof with 1 defi txn and trigger this error state)
            let valid := lt(
                add(asyncDefiInteractionHashesLength, defiInteractionHashesLength),
                sub(ARRAY_LENGTH_MASK, 0x03)
            )

            // should never hit this! If block `i` generates synchronous txns,
            // block 'i + 1' must process them.
            // Only way this array size hits 1024 is if we produce a glut of async interaction results
            // between blocks. HOWEVER we ensure that async interaction callbacks fail iff they would increase
            // defiInteractionHashes length to be >= 512
            if iszero(valid) {
                let mPtr := mload(0x40)
                mstore(mPtr, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                mstore(add(mPtr, 0x04), 0x20)
                mstore(add(mPtr, 0x24), 32)
                mstore(add(mPtr, 0x44), "Rollup Processor: ARRAY_OVERFLOW")
                revert(mPtr, 0x64)
            }

            // copy async hashes into defiInteractionHashes
            mstore(0x00, defiInteractionHashes_slot)
            let defiSlotBase := add(keccak256(0x00, 0x20), defiInteractionHashesLength)
            mstore(0x00, asyncDefiInteractionHashes_slot)
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
            sstore(rollupState_slot, state)
        }
    }

    /**
     * @dev Process asyncdefi interactions.
     *      Callback function for asynchronous bridge interactions.
     *      Can only be called by the bridge contract linked to the interactionNonce
     * @param interactionNonce - unique id of the interaection
     * @param outputValueA - number of tokens of type A (token id recorded in bridge id)
     * @param outputValueB - number of tokens of type B (token id recorded in bridge id)
     */
    function processAsyncDefiInteraction(
        uint256 interactionNonce,
        uint256 outputValueA,
        uint256 outputValueB
    ) external payable {
        reentrancyMutexCheck();
        setReentrancyMutex();
        uint256 bridgeId;
        uint256 totalInputValue;
        bool result;
        bytes32 defiInteractionHash;
        assembly {
            mstore(0x00, interactionNonce)
            mstore(0x20, pendingDefiInteractions_slot)
            let interactionPtr := keccak256(0x00, 0x40)

            bridgeId := sload(interactionPtr)
            totalInputValue := sload(add(interactionPtr, 0x01))

            // delete pendingDefiInteractions[interactionNonce]
            // N.B. only need to delete 1st slot value `bridgeId`. Deleting vars costs gas post-London
            // setting bridgeId to 0 is enough to cause future calls with this interaction nonce to fail
            sstore(interactionPtr, 0x00)

            let bridgeAddressId := and(bridgeId, 0xffffffff)

            // convert the bridgeAddressId into contract address
            mstore(0x00, supportedBridges_slot)
            let bridgeSlot := keccak256(0x00, 0x20)

            if sub(bridgeAddressId, ethAssetId)
            {
                bridgeAddressId := sload(add(bridgeSlot, sub(bridgeAddressId, 0x01)))
                if iszero(bridgeAddressId)
                {
                    revert(0x00, 0x00)
                }
            }

            if iszero(eq(bridgeAddressId, caller())) {
                let mPtr := mload(0x40)
                mstore(mPtr, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                mstore(add(mPtr, 0x04), 0x20)
                mstore(add(mPtr, 0x24), 55)
                mstore(add(mPtr, 0x44), "Rollup Processor: ASYNC_CALLBACK")
                mstore(add(mPtr, 0x64), "_WITH_INVALID_BRIDGE_ID")
                revert(mPtr, 0x84)
            }

            function transferTokens(assetId, outputValue) -> success {
                // we using Eth here?
                if iszero(assetId) {
                    success := eq(outputValue, callvalue())
                    leave
                }

                mstore(0x00, supportedAssets_slot)
                let supportedAssetsSlotBase := keccak256(0x00, 0x20)
                let tokenAddress := sload(add(supportedAssetsSlotBase, sub(assetId, 0x01)))

                // call token.transferFrom(bridgeAddressId, this, outputValue)
                let mPtr := mload(0x40)
                mstore(mPtr, TRANSFER_FROM_SELECTOR)
                mstore(add(mPtr, 0x04), caller())
                mstore(add(mPtr, 0x24), address())
                mstore(add(mPtr, 0x44), outputValue)
                success := call(gas(), tokenAddress, 0, mPtr, 0x64, 0x00, 0x20)
            }

            let secondAssetValid := and(shr(154, bridgeId), 1)
            let success := or(eq(secondAssetValid, 1), eq(outputValueB, 0))

            let hasOutputValueA := gt(outputValueA, 0)
            let hasOutputValueB := gt(outputValueB, 0)
            result := or(hasOutputValueA, hasOutputValueB)
            if iszero(result) {
                let inputAssetId := and(shr(32, bridgeId), 0x3fffffff)
                success := transferTokens(inputAssetId, totalInputValue)
            }
            if and(success, hasOutputValueA) {
                let assetIdA := and(shr(62, bridgeId), 0x3fffffff)
                success := transferTokens(assetIdA, outputValueA)
            }
            if and(success, hasOutputValueB) {
                let assetIdB := and(shr(92, bridgeId), 0x3fffffff)
                success := transferTokens(assetIdB, outputValueB)
            }
            if iszero(success) {
                revert(0x00, 0x00)
            }

            // Compute defiInteractionHash.
            let mPtr := mload(0x40)
            mstore(mPtr, bridgeId)
            mstore(add(mPtr, 0x20), interactionNonce)
            mstore(add(mPtr, 0x40), totalInputValue)
            mstore(add(mPtr, 0x60), outputValueA)
            mstore(add(mPtr, 0x80), outputValueB)
            mstore(add(mPtr, 0xa0), result)
            pop(staticcall(gas(), 0x2, mPtr, 0xc0, 0x00, 0x20))
            defiInteractionHash := mod(mload(0x00), CIRCUIT_MODULUS)
            
            // push async defi interaction hash
            mstore(0x00, asyncDefiInteractionHashes_slot)
            let slotBase := keccak256(0x00, 0x20)

            let state := sload(rollupState_slot)
            let asyncArrayLen := and(ARRAY_LENGTH_MASK, shr(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, state))
            let defiArrayLen := and(ARRAY_LENGTH_MASK, shr(DEFIINTERACTIONHASHES_BIT_OFFSET, state))
            
            // check that size of asyncDefiInteractionHashes isn't such that
            // adding 1 to it will make the next block's defiInteractionHashes length hit 512
            if gt(add(add(1, asyncArrayLen), defiArrayLen), 512)
            {
                mstore(mPtr, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                mstore(add(mPtr, 0x04), 0x20)
                mstore(add(mPtr, 0x24), 32)
                mstore(add(mPtr, 0x44), "Rollup Processor: ARRAY_OVERFLOW")
                revert(mPtr, 0x84)
            }

            // asyncDefiInteractionHashes.push(defiInteractionHash)
            sstore(add(slotBase, asyncArrayLen), defiInteractionHash)

            // update asyncDefiInteractionHashes.length by 1
            let oldState := and(not(shl(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)
            let newState := or(oldState, shl(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, add(asyncArrayLen, 0x01)))

            sstore(rollupState_slot, newState)
        }
        emit AsyncDefiBridgeProcessed(bridgeId, interactionNonce, totalInputValue, outputValueA, outputValueB, result);
        clearReentrancyMutex();
    }

    function transferFee(bytes memory proofData) internal {
        for (uint256 i = 0; i < numberOfAssets; ++i) {
            uint256 assetId = extractAssetId(proofData, i, numberOfBridgeCalls);
            uint256 txFee = extractTotalTxFee(proofData, i, numberOfBridgeCalls);
            if (txFee > 0) {
                bool success;
                if (assetId == ethAssetId) {
                    (success, ) = payable(feeDistributor).call{value: txFee}('');
                } else {
                    address assetAddress = getSupportedAsset(assetId);
                    IERC20(assetAddress).approve(feeDistributor, txFee);
                    (success, ) = feeDistributor.call(
                        abi.encodeWithSignature('deposit(address,uint256)', assetAddress, txFee)
                    );
                }
                require(success, 'Rollup Processor: DEPOSIT_TX_FEE_FAILED');
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
        require(receiverAddress != address(0), 'Rollup Processor: ZERO_ADDRESS');
        if (assetId == 0) {
            // We explicitly do not throw if this call fails, as this opens up the possiblity of
            // griefing attacks, as engineering a failed withdrawal will invalidate an entire rollup block
            payable(receiverAddress).call{gas: 30000, value: withdrawValue}('');
        } else {
            address assetAddress = getSupportedAsset(assetId);
            IERC20(assetAddress).transfer(receiverAddress, withdrawValue);
        }
    }
}

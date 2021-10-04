// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd.
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

/**
 * @title Rollup Processor
 * @dev Smart contract responsible for processing Aztec zkRollups, including relaying them to a verifier
 * contract for validation and performing all relevant ERC20 token transfers
 */
contract RollupProcessor is IRollupProcessor, Decoder, Ownable, Pausable {
    using SafeMath for uint256;

    bytes4 private constant GET_INFO_SELECTOR = 0x5a9b0b89; // bytes4(keccak256('getInfo()'));
    bytes4 private constant CONVERT_SELECTOR = 0x8a8ad2d7; // bytes4(keccak256('convert(address,address,address,address,uint256)'));

    bytes32 private constant INIT_DATA_ROOT = 0x11977941a807ca96cf02d1b15830a53296170bf8ac7d96e5cded7615d18ec607;
    bytes32 private constant INIT_NULL_ROOT = 0x1b831fad9b940f7d02feae1e9824c963ae45b3223e721138c6f73261e690c96a;
    bytes32 private constant INIT_ROOT_ROOT = 0x1b435f036fc17f4cc3862f961a8644839900a8e4f1d0b318a7046dd88b10be75;
    bytes32 private constant INIT_DEFI_ROOT = 0x0170467ae338aaf3fd093965165b8636446f09eeb15ab3d36df2e31dd718883d;
    bytes32 public defiInteractionHash = 0x0f115a0e0c15cdc41958ca46b5b14b456115f4baec5e3ca68599d2a8f435e3b8;

    uint256 public dataSize = 0;
    bytes32 public stateHash =
        keccak256(
            abi.encodePacked(
                uint256(0), // nextRollupId
                INIT_DATA_ROOT,
                INIT_NULL_ROOT,
                INIT_ROOT_ROOT,
                INIT_DEFI_ROOT
            )
        );

    IVerifier public verifier;

    uint256 public immutable escapeBlockLowerBound;
    uint256 public immutable escapeBlockUpperBound;

    event RollupProcessed(uint256 indexed rollupId);

    event DefiBridgeProcessed(
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
    event RollupProviderUpdated(address indexed providerAddress, bool valid);
    event VerifierUpdated(address indexed verifierAddress);

    // Array of supported ERC20 token address.
    address[] public supportedAssets;

    // Mapping which maps an asset address to a bool, determining whether it supports
    // permit as according to ERC-2612
    mapping(address => bool) assetPermitSupport;

    // Mapping from assetId to mapping of userAddress to public userBalance stored on this contract
    mapping(uint256 => mapping(address => uint256)) public userPendingDeposits;

    mapping(address => mapping(bytes32 => bool)) public depositProofApprovals;

    mapping(address => bool) public rollupProviders;

    address public override defiBridgeProxy;

    address public override feeDistributor;

    // Used to guard against re-entrancy attacks when processing DeFi bridge transactions
    bool private reentrancyMutex = false;

    // We need to cap the amount of gas sent to the DeFi bridge contract for two reasons.
    // 1: To provide consistency to rollup providers around costs.
    // 2: To prevent griefing attacks where a bridge consumes all our gas.
    uint256 private gasSentToBridgeProxy = 300000;

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

        return supportedAssets[assetId - 1];
    }

    /**
     * @dev Get the addresses of all supported ERC20 tokens
     */
    function getSupportedAssets() external view override returns (address[] memory) {
        return supportedAssets;
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
        require(reentrancyMutex == false, 'Rollup Processor: REENTRANCY_MUTEX_SET_ON_DEPOSIT');

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
        (bool isOpen, ) = getEscapeHatchStatus();
        require(isOpen, 'Rollup Processor: ESCAPE_BLOCK_RANGE_INCORRECT');

        (bytes memory proofData, uint256 numTxs, uint256 publicInputsHash) =
            decodeProof(rollupHeaderInputLength, txNumPubInputs);
        processRollupProof(proofData, signatures, numTxs, publicInputsHash);
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
    }

    function processRollupProof(
        bytes memory proofData,
        bytes memory signatures,
        uint256 numTxs,
        uint256 publicInputsHash
    ) internal {
        require(reentrancyMutex == false, 'Rollup Processor: REENTRANCY_MUTEX_SET_ON_PROCESS_ROLLUP');
        reentrancyMutex = true;
        verifyProofAndUpdateState(proofData, publicInputsHash);
        processDepositsAndWithdrawals(proofData, numTxs, signatures);
        processDefiBridges(proofData);
        reentrancyMutex = false;
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

        require(oldStateHash == stateHash, 'Rollup Processor: INCORRECT_STATE_HASH');

        uint256 storedDataSize = dataSize;
        // Ensure we are inserting at the next subtree boundary.
        if (storedDataSize % numDataLeaves == 0) {
            require(dataStartIndex == storedDataSize, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        } else {
            uint256 expected = storedDataSize + numDataLeaves - (storedDataSize % numDataLeaves);
            require(dataStartIndex == expected, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        }

        assembly {
            sstore(stateHash_slot, newStateHash)
            sstore(dataSize_slot, add(dataStartIndex, numDataLeaves))
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

    function processDefiBridges(bytes memory proofData) internal {
        bytes32 prevDefiInteractionHash = extractPrevDefiInteractionHash(proofData, rollupHeaderInputLength);
        require(
            prevDefiInteractionHash == defiInteractionHash,
            'Rollup Processor: INCORRECT_PREV_DEFI_INTERACTION_HASH'
        );

        uint256[6 * numberOfBridgeCalls] memory interactionResult;
        uint256 interactionNonce = getRollupId(proofData) * numberOfBridgeCalls;
        for (uint256 i = 0; i < numberOfBridgeCalls; ++i) {
            (
                uint256 bridgeId,
                address bridgeAddress,
                uint256[3] memory assetIds,
                uint32 numOutputAssets,
                uint256 totalInputValue
            ) = extractInteractionData(proofData, i, numberOfBridgeCalls);

            // Do nothing if no bridge id.
            // Rollup circuit makes sure that totalInputValue is 0 for zero bridge id.
            if (bridgeId == 0) {
                break;
            }

            require(totalInputValue > 0, 'Rollup Processor: ZERO_TOTAL_INPUT_VALUE');
            require(numOutputAssets > 0, 'Rollup Processor: ZERO_NUM_OUTPUT_ASSETS');

            bool success;

            // Get ERC20 contract addresses for bridge assets.
            address[3] memory assetAddresses =
                [
                    getSupportedAsset(assetIds[0]),
                    getSupportedAsset(assetIds[1]),
                    numOutputAssets == 2 ? getSupportedAsset(assetIds[2]) : address(0)
                ];

            // Gas efficient call to getInfo(), check response matches interaction data.
            assembly {
                let ptr := mload(0x40)
                mstore(ptr, GET_INFO_SELECTOR)
                success := staticcall(gas(), bridgeAddress, ptr, 0x4, ptr, 0x80)
                success := and(success, eq(numOutputAssets, mload(ptr)))
                success := and(success, eq(mload(assetAddresses), mload(add(ptr, 0x20))))
                success := and(success, eq(mload(add(assetAddresses, 0x20)), mload(add(ptr, 0x40))))
                success := and(success, eq(mload(add(assetAddresses, 0x40)), mload(add(ptr, 0x60))))
                success := and(
                    success,
                    or(eq(numOutputAssets, 1), not(eq(mload(add(ptr, 0x40)), mload(add(ptr, 0x60)))))
                )
            }
            require(success, 'Rollup Processor: INVALID_BRIDGE_ID');

            // Call bridge proxy, which will transfer totalInputValue to the bridge, call convert,
            // and return output values for the two output assets.
            uint256 outputValueA;
            uint256 outputValueB;
            assembly {
                let ptr := mload(0x40)
                mstore(ptr, CONVERT_SELECTOR)
                mstore(add(ptr, 0x4), bridgeAddress)
                mstore(add(ptr, 0x24), mload(assetAddresses))
                mstore(add(ptr, 0x44), mload(add(assetAddresses, 0x20)))
                mstore(add(ptr, 0x64), mload(add(assetAddresses, 0x40)))
                mstore(add(ptr, 0x84), totalInputValue)
                success := delegatecall(
                    sload(gasSentToBridgeProxy_slot),
                    sload(defiBridgeProxy_slot),
                    ptr,
                    0xa4,
                    ptr,
                    0x40
                )
                if eq(success, 1) {
                    outputValueA := mload(ptr)
                    outputValueB := mul(mload(add(ptr, 0x20)), gt(numOutputAssets, 1))
                }
            }

            emit DefiBridgeProcessed(bridgeId, interactionNonce, totalInputValue, outputValueA, outputValueB, success);

            assembly {
                let insertStart := mul(i, 0xc0)
                mstore(add(interactionResult, insertStart), bridgeId)
                mstore(add(interactionResult, add(insertStart, 0x20)), interactionNonce)
                mstore(add(interactionResult, add(insertStart, 0x40)), totalInputValue)
                mstore(add(interactionResult, add(insertStart, 0x60)), outputValueA)
                mstore(add(interactionResult, add(insertStart, 0x80)), outputValueB)
                mstore(add(interactionResult, add(insertStart, 0xa0)), success)
            }

            interactionNonce++;
        }

        assembly {
            pop(staticcall(gas(), 0x2, interactionResult, 0x300, defiInteractionHash_slot, 0x20))
            // Zero the first 4 bits to ensure field conversion doesn't wrap around prime.
            sstore(
                defiInteractionHash_slot,
                and(mload(defiInteractionHash_slot), 0x0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
            )
        }
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

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

import {ECDSA} from '@openzeppelin/contracts/cryptography/ECDSA.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {IVerifier} from './interfaces/IVerifier.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';
import {Decoder} from './Decoder.sol';

/**
 * @title Rollup Processor
 * @dev Smart contract responsible for processing Aztec zkRollups, including relaying them to a verifier
 * contract for validation and performing all relevant ERC20 token transfers
 */
contract RollupProcessor is IRollupProcessor, Decoder, Ownable {
    using SafeMath for uint256;

    bytes32 public dataRoot = 0x2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39;
    bytes32 public nullRoot = 0x15ab517d8b278111e4bb51486fcb14e6ab5729215892cb1a4bdbe873c2b69798;
    bytes32 public rootRoot = 0x2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851;

    uint256 public dataSize;
    uint256 public nextRollupId;

    IVerifier public verifier;

    uint256 public constant txPubInputLength = 12 * 32; // public inputs length for of each inner proof tx
    uint256 public constant rollupPubInputLength = 10 * 32;
    uint256 public immutable escapeBlockLowerBound;
    uint256 public immutable escapeBlockUpperBound;

    event RollupProcessed(uint256 indexed rollupId, bytes32 dataRoot, bytes32 nullRoot);
    event Deposit(address depositorAddress, uint256 depositValue);
    event Withdraw(address withdrawAddress, uint256 withdrawValue);
    event WithdrawError(bytes errorReason);
    event AssetAdded(uint256 indexed assetId, address indexed assetAddress);

    // Array of supported ERC20 token address. The array index of the ERC20 token address
    // corresponds to the assetId of the asset
    address[] public supportedAssets;

    // Mapping from assetId to mapping of userAddress to public userBalance stored on this contract
    mapping(uint256 => mapping(address => uint256)) public userPendingDeposits;

    constructor(
        address[] memory _supportedTokens,
        address _verifierAddress,
        uint256 _escapeBlockLowerBound,
        uint256 _escapeBlockUpperBound
    ) public {
        verifier = IVerifier(_verifierAddress);

        for (uint256 i = 0; i < _supportedTokens.length; i += 1) {
            setSupportedAsset(_supportedTokens[i]);
        }
        escapeBlockLowerBound = _escapeBlockLowerBound;
        escapeBlockUpperBound = _escapeBlockUpperBound;
    }

    /**
     * @dev Get the ERC20 token address of a supported asset, for a given assetId
     * @param assetId - identifier used to denote a particular asset
     */
    function getSupportedAssetAddress(uint256 assetId) public override view returns (address) {
        return supportedAssets[assetId];
    }

    /**
     * @dev Get the addresses of all supported ERC20 tokens
     */
    function getSupportedAssets() external override view returns (address[] memory) {
        return supportedAssets;
    }

    /**
     * @dev Get the number of supported ERC20 tokens
     */
    function getNumSupportedAssets() external override view returns (uint256) {
        return supportedAssets.length;
    }

    /**
     * @dev Get the status of the escape hatch, specifically retrieve whether the
     * hatch is open and also the number of blocks until the hatch will switch from
     * open to closed or vice versa
     */
    function getEscapeHatchStatus() public override view returns (bool, uint256) {
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
    function getUserPendingDeposit(uint256 assetId, address userAddress) external override view returns (uint256) {
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

        userPendingDeposits[assetId][transferFromAddress] = userPendingDeposits[assetId][transferFromAddress].sub(
            amount
        );
    }

    /**
     * @dev Set the mapping between an assetId and the address of the linked asset.
     * Protected by onlyOwner
     * @param _linkedToken - address of the asset
     */
    function setSupportedAsset(address _linkedToken) public override onlyOwner {
        require(_linkedToken != address(0x0), 'Rollup Processor: ZERO_ADDRESS');
        supportedAssets.push(_linkedToken);

        uint256 assetId = supportedAssets.length.sub(1);
        emit AssetAdded(assetId, _linkedToken);
    }

    /**
     * @dev Deposit ERC20 tokens to the contract, the first stage of the two part
     * deposit flow.
     * @param assetId - unique identifier for the asset being deposited
     * @param amount - number of ERC20 tokens to transfer to the contract from the user's
     * address
     */
    // depositor address needs to be selected/input, as now it's the ethereum_blockchain sending
    function depositPendingFunds(
        uint256 assetId,
        uint256 amount,
        address depositorAddress
    ) external override {
        address assetAddress = getSupportedAssetAddress(assetId);

        // update userPendingDeposits to keep track of deposit
        increasePendingDepositBalance(assetId, depositorAddress, amount);

        // check user approved contract to transfer funds, so can throw helpful error to user
        uint256 rollupAllowance = IERC20(assetAddress).allowance(depositorAddress, address(this));
        require(rollupAllowance >= amount, 'Rollup Processor: INSUFFICIENT_TOKEN_APPROVAL');

        IERC20(assetAddress).transferFrom(depositorAddress, address(this), amount);
        emit Deposit(depositorAddress, amount);
    }

    /**
     * @dev Process a rollup - decode the rollup, update relevant state variables and
     * verify the proof
     * @param proofData - cryptographic proof data associated with a rollup
     * @param signatures - bytes array of secp256k1 ECDSA signatures, authorising a transfer of tokens
     * from the publicOwner for the particular inner proof in question. There is a signature for each
     * inner proof.
     *
     * Structure of each signature in the bytes array is:
     * 0x00 - 0x20 : r
     * 0x20 - 0x40 : s
     * 0x40 - 0x60 : v (in form: 0x0000....0001b for example)
     *
     * @param sigIndexes - array specifying which innerProof each signature corresponds to. This is needed
     * as proofs without a token transfer do not require a token transfer authorisation signature.
     *
     * For example:
     * If sigIndexes = [0, 2, 3] this would mean that:
     * signature[0] corresponds to innerProof[0]
     * signature[1] corresponds to innerProof[2]
     * signature[2] corresponds to innerProof[3]
     * @param viewingKeys - viewingKeys for the notes submitted in the rollup. Note: not used in the logic
     * of the rollupProcessor contract, but called here as a convenient to place data on chain
     */
    function processRollup(
        bytes calldata proofData,
        bytes calldata signatures,
        uint256[] calldata sigIndexes,
        bytes calldata viewingKeys
    ) external override {
        uint256 numTxs = updateAndVerifyProof(proofData);
        processTransactions(proofData[rollupPubInputLength:], numTxs, signatures, sigIndexes);
    }

    /**
     * @dev Validate that the supplied Merkle roots are correct, verify the zk proof and update the contract state
     * variables with those provided by the rollup
     *
     * @param proofData - cryptographic zk proof data. Passed to the verifier for verification
     */
    function updateAndVerifyProof(bytes memory proofData) internal returns (uint256) {
        (
            bytes32 newDataRoot,
            bytes32 newNullRoot,
            uint256 rollupId,
            uint256 rollupSize,
            bytes32 newRootRoot,
            uint256 numTxs,
            uint256 newDataSize
        ) = validateMerkleRoots(proofData);

        verifier.verify(proofData, rollupSize);

        // rollupSize = 0 indicates an escape hatch proof
        if (rollupSize == 0) {
            // Ensure an escaper, can only escape within last the set escape hatch window
            (bool isOpen, ) = getEscapeHatchStatus();
            require(isOpen, 'Rollup Processor: ESCAPE_BLOCK_RANGE_INCORRECT');
        }

        // update state variables
        dataRoot = newDataRoot;
        nullRoot = newNullRoot;
        nextRollupId = rollupId.add(1);
        rootRoot = newRootRoot;
        dataSize = newDataSize;

        emit RollupProcessed(rollupId, newDataRoot, newNullRoot);
        return numTxs;
    }

    /**
     * @dev Decode a proof to extract the Merkle roots and validate they are as expected
     * Return needed variables
     * @param proofData - cryptographic proof data associated with a rollup
     */
    function validateMerkleRoots(bytes memory proofData)
        internal
        view
        returns (
            bytes32,
            bytes32,
            uint256,
            uint256,
            bytes32,
            uint256,
            uint256
        )
    {
        (
            // Stack to deep workaround:
            // 0: rollupId
            // 1: rollupSize
            // 2: dataStartIndex
            // 3: numTxs
            uint256[4] memory nums,
            bytes32 oldDataRoot,
            bytes32 newDataRoot,
            bytes32 oldNullRoot,
            bytes32 newNullRoot,
            bytes32 oldRootRoot,
            bytes32 newRootRoot
        ) = decodeProof(proofData);

        // Escape hatch denominated by a rollup size of 0, which means inserting 2 new entries.
        uint256 toInsert = nums[1] == 0 ? 2 : nums[1].mul(2);
        if (dataSize % toInsert == 0) {
            require(nums[2] == dataSize, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        } else {
            uint256 expected = dataSize + toInsert - (dataSize % toInsert);
            require(nums[2] == expected, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        }

        // data validation checks
        require(oldDataRoot == dataRoot, 'Rollup Processor: INCORRECT_DATA_ROOT');
        require(oldNullRoot == nullRoot, 'Rollup Processor: INCORRECT_NULL_ROOT');
        require(oldRootRoot == rootRoot, 'Rollup Processor: INCORRECT_ROOT_ROOT');
        require(nums[0] == nextRollupId, 'Rollup Processor: ID_NOT_SEQUENTIAL');
        require(nums[3] > 0, 'Rollup Processor: NUM_TX_IS_ZERO');

        return (newDataRoot, newNullRoot, nums[0], nums[1], newRootRoot, nums[3], nums[2] + toInsert);
    }

    /**
     * @dev Process all inner proof data - extract the data, verify the proof and perform
     * any transfer of tokens
     * @param innerProofData - all proofData associated with the rolled up transactions
     * @param numTxs - number of transactions rolled up in the proof
     * @param signatures - bytes array of secp256k1 ECDSA signatures, authorising a transfer of tokens
     * @param sigIndexes - array specifying which innerProof each signature corresponds to. This is needed
     * as proofs without a token transfer do not require a token transfer authorisation signature
     *
     * For example:
     * If sigIndexes = [0, 2, 3] this would mean that:
     * signature[0] corresponds to innerProof[0]
     * signature[1] corresponds to innerProof[2]
     * signature[2] corresponds to innerProof[3]
     *
     * 1st signature = 2nd inner proof
     */
    function processTransactions(
        bytes calldata innerProofData,
        uint256 numTxs,
        bytes calldata signatures,
        uint256[] calldata sigIndexes
    ) internal {
        for (uint256 i = 0; i < numTxs; i += 1) {
            bytes calldata proof = innerProofData[i.mul(txPubInputLength):i.mul(txPubInputLength).add(
                txPubInputLength
            )];
            (
                uint256 proofId,
                uint256 publicInput,
                uint256 publicOutput,
                uint256 assetId,
                address inputOwner,
                address outputOwner
            ) = extractTxComponents(proof);

            if (proofId == 0) {
                if (publicInput > 0) {
                    bytes memory signature = extractSignature(signatures, findSigIndex(sigIndexes, i));
                    validateSignature(proof, signature, inputOwner);
                    decreasePendingDepositBalance(assetId, inputOwner, publicInput);
                }

                if (publicOutput > 0) {
                    withdraw(publicOutput, outputOwner, assetId);
                }
            }
        }
    }

    /**
     * Perform ECDSA signature validation for a signature over a proof. Relies on the
     * openzeppelin ECDSA cryptography library - this performs checks on `s` and `v`
     * to prevent signature malleability based attacks
     *
     * @param innerPublicInputs - Inner proof data for a single transaction. Includes deposit and withdrawal data
     * @param signature - ECDSA signature over the secp256k1 elliptic curve
     * @param publicOwner - address which ERC20 tokens are from being transferred from or to
     */
    function validateSignature(
        bytes calldata innerPublicInputs,
        bytes memory signature,
        address publicOwner
    ) internal pure {
        require(publicOwner != address(0x0), 'Rollup Processor: ZERO_ADDRESS');

        bytes32 digest = keccak256(innerPublicInputs);
        bytes32 msgHash = ECDSA.toEthSignedMessageHash(digest);

        address recoveredSigner = ECDSA.recover(msgHash, signature);
        require(recoveredSigner == publicOwner, 'Rollup Processor: INVALID_TRANSFER_SIGNATURE');
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
        address assetAddress = getSupportedAssetAddress(assetId);

        try IERC20(assetAddress).transfer(receiverAddress, withdrawValue)  {
            emit Withdraw(receiverAddress, withdrawValue);
        } catch (bytes memory reason) {
            emit WithdrawError(reason);
        }
    }
}

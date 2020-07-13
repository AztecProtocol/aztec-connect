// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

import {ECDSA} from '@openzeppelin/contracts/cryptography/ECDSA.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {IVerifier} from './interfaces/IVerifier.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';
import {Verifier} from './Verifier.sol';
import {Decoder} from './Decoder.sol';

contract RollupProcessor is IRollupProcessor, Decoder, Ownable {
    using SafeMath for uint256;

    bytes32 public dataRoot = 0x1df6bde50516dd1201088fd8dda84c97eda5652428d1c7e86af529cc5e0eb821;
    bytes32 public nullRoot = 0x152175cffcb23dfbd80262802e32efe7db5fdcb91ba0a0527ab1ffb323bf3fc0;
    bytes32 public rootRoot = 0x1b22ef607ae08588bc83a79ffacec507347bd2dee44c846181b7051285c32c0a;

    uint256 public dataSize;
    uint256 public nextRollupId;

    IVerifier public verifier;
    IERC20 public linkedToken;

    uint256 public scalingFactor; // scale between Aztec note units and ERC20 units
    uint256 public constant txPubInputLength = 0x120; // public inputs length for of each inner proof tx

    event RollupProcessed(uint256 indexed rollupId, bytes32 dataRoot, bytes32 nullRoot);
    event Deposit(address depositorAddress, uint256 depositValue);
    event Withdraw(address withdrawAddress, uint256 withdrawValue);

    constructor(address _linkedToken, uint256 _scalingFactor) public {
        require(_linkedToken != address(0x0), 'Rollup Processor: ZERO_ADDRESS');
        require(_scalingFactor != uint256(0), 'Rollup Processor: ZERO_SCALING_FACTOR');

        linkedToken = IERC20(_linkedToken);
        scalingFactor = _scalingFactor;
        verifier = new Verifier();
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
     * @param viewingKeys - viewingKeys for the notes submitted in the rollup
     * @param rollupSize - number of transactions included in the rollup
     */
    function processRollup(
        bytes calldata proofData,
        bytes calldata signatures,
        uint256[] calldata sigIndexes,
        bytes calldata viewingKeys,
        uint256 rollupSize
    ) external override onlyOwner {
        uint256 numTxs = updateAndVerifyProof(proofData, rollupSize);
        processTransactions(proofData[0x120:], numTxs, signatures, sigIndexes);
    }

    function updateAndVerifyProof(bytes memory _proofData, uint256 rollupSize) internal returns (uint256) {
        (
            bytes32 newDataRoot,
            bytes32 newNullRoot,
            uint256 rollupId,
            bytes32 newRootRoot,
            uint256 numTxs
        ) = validateMerkleRoots(_proofData);

        verifier.verify(_proofData);

        // update state variables
        dataRoot = newDataRoot;
        nullRoot = newNullRoot;
        nextRollupId = rollupId.add(1);
        rootRoot = newRootRoot;
        dataSize = dataSize.add(rollupSize.mul(2));

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
            bytes32,
            uint256
        )
    {
        (
            uint256 rollupId,
            uint256 dataStartIndex,
            bytes32 oldDataRoot,
            bytes32 newDataRoot,
            bytes32 oldNullRoot,
            bytes32 newNullRoot,
            bytes32 oldRootRoot,
            bytes32 newRootRoot,
            uint256 numTxs
        ) = decodeProof(proofData);

        // data validation checks
        require(oldDataRoot == dataRoot, 'Rollup Processor: INCORRECT_DATA_ROOT');
        require(oldNullRoot == nullRoot, 'Rollup Processor: INCORRECT_NULL_ROOT');
        require(oldRootRoot == rootRoot, 'Rollup Processor: INCORRECT_ROOT_ROOT');
        require(rollupId == nextRollupId, 'Rollup Processor: ID_NOT_SEQUENTIAL');
        require(dataStartIndex >= 0, 'Rollup Processor: DATA_START_NOT_GREATER_ZERO');
        require(numTxs > 0, 'Rollup Processor: NUM_TX_IS_ZERO');

        return (newDataRoot, newNullRoot, rollupId, newRootRoot, numTxs);
    }

    /**
     * @dev Decode the public inputs component of proofData. Required to update state variables
     * @param proofData - cryptographic proofData associated with a rollup
     */
    function decodeProof(bytes memory proofData)
        internal
        pure
        returns (
            uint256 rollupId,
            uint256 dataStartIndex,
            bytes32 oldDataRoot,
            bytes32 newDataRoot,
            bytes32 oldNullRoot,
            bytes32 newNullRoot,
            bytes32 oldRootRoot,
            bytes32 newRootRoot,
            uint256 numTxs
        )
    {
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            rollupId := mload(dataStart)
            dataStartIndex := mload(add(dataStart, 0x20))
            oldDataRoot := mload(add(dataStart, 0x40))
            newDataRoot := mload(add(dataStart, 0x60))
            oldNullRoot := mload(add(dataStart, 0x80))
            newNullRoot := mload(add(dataStart, 0xa0))
            oldRootRoot := mload(add(dataStart, 0xc0))
            newRootRoot := mload(add(dataStart, 0xe0))
            numTxs := mload(add(dataStart, 0x100))
        }
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
            (uint256 publicInput, uint256 publicOutput, address publicOwner) = extractTxComponents(proof);

            // scope block to avoid stack too deep errors
            {
                if (publicInput > 0) {
                    bytes memory signature = extractSignature(signatures, findSigIndex(sigIndexes, i));
                    validateSignature(proof, signature, publicOwner);
                    deposit(publicInput, publicOwner);
                }

                if (publicOutput > 0) {
                    withdraw(publicOutput, publicOwner);
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
     * @dev Internal utility function to deposit funds into the contract
     * @param depositValue - value being deposited into the contract, in return for
     * zk notes
     * @param depositorAddress - address which is depositing into the contract
     * and receiving zk notes. ERC20s are transferred from this address
     */
    function deposit(uint256 depositValue, address depositorAddress) internal {
        require(depositorAddress != address(0), 'Rollup Processor: ZERO_ADDRESS');

        // check user approved contract to transfer funds, so can throw helpful error to user
        uint256 rollupAllowance = linkedToken.allowance(depositorAddress, address(this));
        require(rollupAllowance >= depositValue, 'Rollup Processor: INSUFFICIENT_TOKEN_APPROVAL');

        // scaling factor to convert between Aztec notes and DAI
        linkedToken.transferFrom(depositorAddress, address(this), depositValue.mul(scalingFactor));
        emit Deposit(depositorAddress, depositValue);
    }

    /**
     * @dev Internal utility function to withdraw funds from the contract to a receiver address
     * @param withdrawValue - value being withdrawn from the contract
     * @param receiverAddress - address receiving public ERC20 tokens
     */
    function withdraw(uint256 withdrawValue, address receiverAddress) internal {
        require(receiverAddress != address(0), 'Rollup Processor: ZERO_ADDRESS');

        uint256 rollupBalance = linkedToken.balanceOf(address(this));
        require(withdrawValue <= rollupBalance, 'Rollup Processor: INSUFFICIENT_FUNDS');

        // scaling factor to convert between Aztec notes and DAI
        linkedToken.transfer(receiverAddress, withdrawValue.mul(scalingFactor));
        emit Withdraw(receiverAddress, withdrawValue);
    }
}

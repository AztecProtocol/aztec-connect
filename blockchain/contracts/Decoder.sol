// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {Types} from './verifier/cryptography/Types.sol';
import {Bn254Crypto} from './verifier/cryptography/Bn254Crypto.sol';

/**
 * Rollup proof decoder. Encoded proofData structure is as follows:
 *
 * length
 * rollupId
 * dataStartIndex
 * oldDataRoot
 * newDataRoot
 * oldNullRoot
 * newNullRoot
 * oldDataRootsRoot
 * newDataRootsRoot
 * oldDefiRoot
 * newDefiRoot
 * bridgeIds[numberOfBridgeCalls]
 * depositSums[numberOfBridgeCalls]
 * assetIds[numberOfAssets]
 * txFees[numberOfAssets]
 * encodedInnerProofData.length (4 bytes)
 * encodedInnerProofData
 * recursiveProofOutput
 * interactionNotes[numberOfBridgeCalls]
 * prevDefiInteractionHash
 */
contract Decoder {
    using SafeMath for uint256;

    function decodeProof(uint256 rollupHeaderInputLength, uint256 txNumPubInputs)
        internal
        pure
        returns (bytes memory proofData, uint256 numTxs)
    {
        uint256 dataSize;
        assembly {
            // Add encoded proof data size to dataSize, minus the 4 bytes of encodedInnerProofData.length.
            let inPtr := add(calldataload(0x04), 0x4)
            dataSize := sub(calldataload(inPtr), 0x4)
            inPtr := add(inPtr, 0x20)

            // Get encoded inner proof data size.
            let encodedInnerDataSize := calldataload(add(inPtr, sub(rollupHeaderInputLength, 0x1c)))

            // Calculate the size of the data after inner proof data.
            let tailDataSize := sub(sub(dataSize, rollupHeaderInputLength), encodedInnerDataSize)

            // Add the size of trimmed zero bytes to dataSize.
            let rollupSize := calldataload(add(inPtr, 0x20))
            let txSize := mul(txNumPubInputs, 0x20)
            let decodedInnerDataSize := mul(rollupSize, txSize)
            dataSize := add(dataSize, sub(decodedInnerDataSize, encodedInnerDataSize))

            // Allocate memory for `proofData`.
            // - 0x20: decoded proof data size
            // - `dataSize`: decoded proof data
            proofData := mload(0x40)
            mstore(0x40, add(proofData, add(dataSize, 0x20)))
            let outPtr := proofData

            // Write decoded proof data size to `proofData`.
            mstore(outPtr, dataSize)
            outPtr := add(outPtr, 0x20)

            // Copy rollup header data to `proofData`.
            calldatacopy(outPtr, inPtr, rollupHeaderInputLength)
            inPtr := add(inPtr, add(rollupHeaderInputLength, 0x4))
            outPtr := add(outPtr, rollupHeaderInputLength)

            // Copy the data after inner proof data to `proofData`.
            let tailInPtr := add(inPtr, encodedInnerDataSize)
            let tailOutPtr := add(outPtr, decodedInnerDataSize)
            calldatacopy(tailOutPtr, tailInPtr, tailDataSize)

            // Decode inner proofs.
            let encoding
            for {

            } gt(tailInPtr, inPtr) {
                numTxs := add(numTxs, 1)
            } {
                encoding := byte(0, calldataload(inPtr))
                switch encoding
                    case 0 {
                        // Deposit
                        calldatacopy(add(outPtr, 0x20), add(inPtr, 0x1), 0x20) // publicInput
                        calldatacopy(add(outPtr, 0x60), add(inPtr, 0x21), 0xa0) // assetId ... nullifier2
                        mstore(
                            add(outPtr, 0x100),
                            and(calldataload(add(inPtr, 0xb5)), 0xffffffffffffffffffffffffffffffffffffffff)
                        ) // inputOwner
                        inPtr := add(inPtr, 0xd5)
                    }
                    case 1 {
                        // Withdraw
                        calldatacopy(add(outPtr, 0x40), add(inPtr, 0x1), 0xc0) // publicOutput ... nullifier2
                        mstore(
                            add(outPtr, 0x120),
                            and(calldataload(add(inPtr, 0xb5)), 0xffffffffffffffffffffffffffffffffffffffff)
                        ) // outputOwner
                        inPtr := add(inPtr, 0xd5)
                    }
                    case 2 {
                        // Send
                        calldatacopy(add(outPtr, 0x60), add(inPtr, 0x1), 0xa0) // assetId ... nullifier2
                        inPtr := add(inPtr, 0xa1)
                    }
                    case 3 {
                        // Account
                        mstore(outPtr, 1) // proofId
                        calldatacopy(add(outPtr, 0x20), add(inPtr, 0x1), 0x120) // publicInput ... outputOwner
                        inPtr := add(inPtr, 0x121)
                    }
                    case 4 {
                        // Defi Deposit
                        mstore(outPtr, 2) // proofId
                        calldatacopy(add(outPtr, 0x40), add(inPtr, 0x1), 0xe0) // publicOutput ... inputOwner
                        inPtr := add(inPtr, 0xe1)
                    }
                    case 5 {
                        // Defi Claim
                        mstore(outPtr, 3) // proofId
                        calldatacopy(add(outPtr, 0x60), add(inPtr, 0x1), 0x80) // assetId ... nullifier1
                        calldatacopy(add(outPtr, 0x100), add(inPtr, 0x81), 0x20) // inputOwner
                        inPtr := add(inPtr, 0xa1)
                    }
                    default {

                    }

                outPtr := add(outPtr, txSize)
            }
        }
    }

    /**
     * @dev Decode the public inputs component of proofData. Required to update state variables
     * @param proofData - cryptographic proofData associated with a rollup
     */
    function extractRoots(bytes memory proofData)
        internal
        pure
        returns (
            uint256[3] memory nums,
            bytes32[4] memory oldRoots,
            bytes32[4] memory newRoots
        )
    {
        uint256 rollupId;
        uint256 rollupSize;
        uint256 dataStartIndex;
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            rollupId := mload(dataStart)
            rollupSize := mload(add(dataStart, 0x20))
            dataStartIndex := mload(add(dataStart, 0x40))
            mstore(oldRoots, mload(add(dataStart, 0x60)))
            mstore(newRoots, mload(add(dataStart, 0x80)))
            mstore(add(oldRoots, 0x20), mload(add(dataStart, 0xa0)))
            mstore(add(newRoots, 0x20), mload(add(dataStart, 0xc0)))
            mstore(add(oldRoots, 0x40), mload(add(dataStart, 0xe0)))
            mstore(add(newRoots, 0x40), mload(add(dataStart, 0x100)))
            mstore(add(oldRoots, 0x60), mload(add(dataStart, 0x120)))
            mstore(add(newRoots, 0x60), mload(add(dataStart, 0x140)))
        }
        return ([rollupId, rollupSize, dataStartIndex], oldRoots, newRoots);
    }

    function extractPrevDefiInteractionHash(
        bytes memory proofData,
        uint256 rollupHeaderInputLength,
        uint256 numberOfBridgeCalls,
        uint256 txNumPubInputs
    ) internal pure returns (bytes32 prevDefiInteractionHash) {
        // Skip over header, recursion point and defi notes.
        // 0x200 = recursion points.
        uint256 partOffset = rollupHeaderInputLength + 0x200 + (numberOfBridgeCalls * 32);
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            let rollupSize := mload(add(dataStart, 0x20))
            // Skip over rollup pub inputs.
            prevDefiInteractionHash := mload(
                add(dataStart, add(partOffset, mul(mul(rollupSize, txNumPubInputs), 0x20)))
            )
        }
    }

    function extractInteractionData(
        bytes memory proofData,
        uint256 idx,
        uint256 numberOfBridgeCalls
    )
        internal
        pure
        returns (
            uint256 bridgeId,
            address bridgeAddress,
            uint256[3] memory assetIds,
            uint32 numOutputAssets,
            uint256 totalInputValue
        )
    {
        assembly {
            let dataStart := add(add(proofData, 0x180), mul(0x20, idx))
            bridgeId := mload(dataStart)
            bridgeAddress := and(bridgeId, 0xffffffffffffffffffffffffffffffffffffffff)
            numOutputAssets := and(shr(160, bridgeId), 3)
            mstore(assetIds, and(shr(162, bridgeId), 0x3fffffff))
            mstore(add(assetIds, 0x20), and(shr(192, bridgeId), 0x3fffffff))
            mstore(add(assetIds, 0x40), and(shr(222, bridgeId), 0x3fffffff))
            totalInputValue := mload(add(dataStart, mul(0x20, numberOfBridgeCalls)))
        }
    }

    function extractAssetId(
        bytes memory proofData,
        uint256 idx,
        uint256 numberOfBridgeCalls
    ) internal pure returns (uint256 totalTxFee) {
        assembly {
            totalTxFee := mload(add(add(add(proofData, 0x180), mul(0x40, numberOfBridgeCalls)), mul(0x20, idx)))
        }
    }

    function extractTotalTxFee(
        bytes memory proofData,
        uint256 idx,
        uint256 numberOfBridgeCalls
    ) internal pure returns (uint256 totalTxFee) {
        assembly {
            totalTxFee := mload(add(add(add(proofData, 0x380), mul(0x40, numberOfBridgeCalls)), mul(0x20, idx)))
        }
    }
}

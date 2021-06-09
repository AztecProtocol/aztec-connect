// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {Types} from './verifier/cryptography/Types.sol';
import {Bn254Crypto} from './verifier/cryptography/Bn254Crypto.sol';

/**
 * Rollup proof decoder. proofData structure is as follows:
 *
 * length
 * rollupId
 * rollupSize
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
 * txFees[numberOfAssets]
 * innerProofData[rollupSize]
 * interactionData[numberOfBridgeCalls]
 * prevDefiInteractionHash
 */
contract Decoder {
    using SafeMath for uint256;

    /**
     * @dev Decode the public inputs component of proofData. Required to update state variables
     * @param proofData - cryptographic proofData associated with a rollup
     */
    function decodeProof(bytes memory proofData)
        internal
        pure
        returns (
            uint256[3] memory nums,
            bytes32[2] memory dataRoots,
            bytes32[2] memory nullRoots,
            bytes32[2] memory rootRoots
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
            mstore(dataRoots, mload(add(dataStart, 0x60)))
            mstore(add(dataRoots, 0x20), mload(add(dataStart, 0x80)))
            mstore(nullRoots, mload(add(dataStart, 0xa0)))
            mstore(add(nullRoots, 0x20), mload(add(dataStart, 0xc0)))
            mstore(rootRoots, mload(add(dataStart, 0xe0)))
            mstore(add(rootRoots, 0x20), mload(add(dataStart, 0x100)))
        }
        return ([rollupId, rollupSize, dataStartIndex], dataRoots, nullRoots, rootRoots);
    }

    function extractPrevDefiInteractionHash(
        bytes memory proofData,
        uint256 rollupPubInputLength,
        uint256 txPubInputLength
    ) internal pure returns (bytes32 prevDefiInteractionHash) {
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            let rollupSize := mload(add(dataStart, 0x20))
            rollupSize := add(rollupSize, iszero(rollupSize))
            // Skip over rollup pub inputs, tx pub inputs, recursion point and defi notes.
            prevDefiInteractionHash := mload(
                add(add(add(dataStart, rollupPubInputLength), mul(rollupSize, txPubInputLength)), 0x300)
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
            bridgeAddress := shr(92, bridgeId)
            numOutputAssets := and(shr(90, bridgeId), 3)
            mstore(assetIds, and(shr(58, bridgeId), 0xffffffff))
            mstore(add(assetIds, 0x20), and(shr(26, bridgeId), 0xffffffff))
            mstore(add(assetIds, 0x40), and(bridgeId, 0x3ffffff))
            totalInputValue := mload(add(dataStart, mul(0x20, numberOfBridgeCalls)))
        }
    }

    function extractTotalTxFee(
        bytes memory proofData,
        uint256 assetId,
        uint256 numberOfBridgeCalls
    ) internal pure returns (uint256 totalTxFee) {
        assembly {
            totalTxFee := mload(add(add(add(proofData, 0x180), mul(0x40, numberOfBridgeCalls)), mul(0x20, assetId)))
        }
    }
}

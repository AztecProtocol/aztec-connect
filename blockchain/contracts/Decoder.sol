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
 * assetIds[numberOfAssets]
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
        uint256 txPubInputLength,
        uint256 numberOfBridgeCalls
    ) internal pure returns (bytes32 prevDefiInteractionHash) {
        // Skip over header, recursion point and defi notes.
        // 0x200 = recursion points.
        uint256 partOffset = rollupHeaderInputLength + 0x200 + (numberOfBridgeCalls * 32);
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            let rollupSize := mload(add(dataStart, 0x20))
            // Skip over rollup pub inputs.
            prevDefiInteractionHash := mload(add(dataStart, add(partOffset, mul(rollupSize, txPubInputLength))))
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

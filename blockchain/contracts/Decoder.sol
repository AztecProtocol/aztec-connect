// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {Types} from './verifier/cryptography/Types.sol';
import {Bn254Crypto} from './verifier/cryptography/Bn254Crypto.sol';

contract Decoder {
    using SafeMath for uint256;

    /**
     * @dev Decode the public inputs component of proofData. Required to update state variables
     * @param proofData - cryptographic proofData associated with a rollup
     */
    function decodeProof(bytes memory proofData, uint256 numberOfAssets)
        internal
        pure
        returns (
            uint256[4] memory nums,
            bytes32 oldDataRoot,
            bytes32 newDataRoot,
            bytes32 oldNullRoot,
            bytes32 newNullRoot,
            bytes32 oldRootRoot,
            bytes32 newRootRoot
        )
    {
        uint256 rollupId;
        uint256 rollupSize;
        uint256 dataStartIndex;
        uint256 numTxs;
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            rollupId := mload(dataStart)
            rollupSize := mload(add(dataStart, 0x20))
            dataStartIndex := mload(add(dataStart, 0x40))
            oldDataRoot := mload(add(dataStart, 0x60))
            newDataRoot := mload(add(dataStart, 0x80))
            oldNullRoot := mload(add(dataStart, 0xa0))
            newNullRoot := mload(add(dataStart, 0xc0))
            oldRootRoot := mload(add(dataStart, 0xe0))
            newRootRoot := mload(add(dataStart, 0x100))
            numTxs := mload(add(add(dataStart, 0x120), mul(0x20, numberOfAssets)))
        }
        return (
            [rollupId, rollupSize, dataStartIndex, numTxs],
            oldDataRoot,
            newDataRoot,
            oldNullRoot,
            newNullRoot,
            oldRootRoot,
            newRootRoot
        );
    }

    function extractTotalTxFee(bytes memory proofData, uint256 assetId) internal pure returns (uint256) {
        uint256 totalTxFee;
        assembly {
            totalTxFee := mload(add(add(proofData, 0x140), mul(0x20, assetId)))
        }
        return totalTxFee;
    }
}

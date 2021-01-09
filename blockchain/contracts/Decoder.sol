// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {Types} from './verifier/cryptography/Types.sol';
import {PairingsBn254} from './verifier/cryptography/PairingsBn254.sol';

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
            numTxs := mload(add(dataStart, 0x140))
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

    function extractTotalTxFee(bytes memory proofData) internal pure returns (uint256) {
        uint256 totalTxFee;
        assembly {
            totalTxFee := mload(add(proofData, 0x140))
        }
        return totalTxFee;
    }

    /**
     * @dev Find the signature index
     * @param sigIndexes - array specifying whic transaction each signature corresponds to
     * @param txIndex - current transaction number
     */
    function findSigIndex(uint256[] memory sigIndexes, uint256 txIndex) internal pure returns (uint256) {
        for (uint256 i = 0; i <= sigIndexes.length; i += 1) {
            if (sigIndexes[i] == txIndex) {
                return i;
            }
        }
    }

    /**
     * @dev Extract the various data needed from the proofData and signatures bytes array.
     * Information later used for signature validation and token transfer
     *
     * @param proof - inner proof
     */
    function extractTxComponents(bytes memory proof)
        internal
        pure
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            address,
            address
        )
    {
        uint256 proofId;
        uint256 publicInput;
        uint256 publicOutput;
        uint256 assetId;
        address inputOwner;
        address outputOwner;
        assembly {
            proofId := mload(add(proof, 0x20))
            publicInput := mload(add(proof, 0x40))
            publicOutput := mload(add(proof, 0x60))
            assetId := mload(add(proof, 0x80))
            inputOwner := mload(add(proof, 0x160))
            outputOwner := mload(add(proof, 0x180))
        }

        return (proofId, publicInput, publicOutput, assetId, inputOwner, outputOwner);
    }

    /**
     * @dev Extract a signature and it's corresponding nonce, according to the signature index
     * @param signatures - signatures concatenated together, approving deposits proofs to transfer
     * tokens on behalf of the user
     * @param sigIndex - current signature index
     */
    function extractSignature(bytes memory signatures, uint256 sigIndex) internal pure returns (bytes memory) {
        uint256 sigLength = 0x60;
        bytes32 s;
        bytes32 r;
        uint8 v;
        assembly {
            let sigStart := add(add(signatures, 0x20), mul(sigIndex, sigLength))
            r := mload(sigStart)
            s := mload(add(sigStart, 0x20))
            v := mload(add(sigStart, 0x40))
        }

        bytes memory signature = abi.encodePacked(r, s, v);
        return signature;
    }
}

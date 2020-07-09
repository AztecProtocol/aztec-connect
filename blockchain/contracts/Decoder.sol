// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

contract Decoder {
    using SafeMath for uint256;

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
            address
        )
    {
        uint256 publicInput;
        uint256 publicOutput;
        address publicOwner;
        assembly {
            publicInput := mload(add(proof, 0x20))
            publicOutput := mload(add(proof, 0x40))
            publicOwner := mload(add(proof, 0x120))
        }

        return (publicInput, publicOutput, publicOwner);
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

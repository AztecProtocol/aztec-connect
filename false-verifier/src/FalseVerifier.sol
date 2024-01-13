// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

interface IVerifier {
    function verify(bytes memory _serializedProof, uint256 _publicInputsHash) external returns (bool);

    function getVerificationKeyHash() external pure returns (bytes32);
}

/**
 * @title Plonk proof verification contract
 * @dev Warning: False verifier
 * Stops verification
 */
contract FalseVerifier is IVerifier {
    /**
     * @dev Fail verification
     */
    function verify(bytes memory, uint256) external pure override returns (bool) {
        return false;
    }

    function getVerificationKeyHash() external pure override returns (bytes32) {
        return bytes32("always false");
    }
}

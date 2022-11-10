// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

interface IVerifier {
    function verify(bytes memory _serializedProof, uint256 _publicInputsHash) external returns (bool);

    function getVerificationKeyHash() external pure returns (bytes32);
}

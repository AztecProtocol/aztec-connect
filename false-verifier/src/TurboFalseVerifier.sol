
    // SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
// pragma solidity >=0.6.10 <0.8.0;
pragma solidity ^0.8.13;

interface IVerifier {
    function verify(bytes memory serialized_proof, uint256 _keyId) external;
}

contract TurboFalseVerifier is IVerifier {
    function verify(bytes memory, uint256) external pure override {
        revert("Proof failed");
    }
}
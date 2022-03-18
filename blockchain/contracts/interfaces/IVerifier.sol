// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4 <0.8.11;

interface IVerifier {
    function verify(bytes memory serialized_proof, uint256 _publicInputsHash) external returns (bool);
}

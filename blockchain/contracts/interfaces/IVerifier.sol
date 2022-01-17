// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.8.4 <0.8.11;

interface IVerifier {
    function verify(bytes memory serialized_proof, uint256 _publicInputsHash) external returns (bool);
}

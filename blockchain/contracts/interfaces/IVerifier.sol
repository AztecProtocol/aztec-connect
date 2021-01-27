// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

interface IVerifier {
    function verify(bytes memory serialized_proof, uint256 _keyId) external;
}

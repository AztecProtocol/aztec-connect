// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {MockVerificationKey} from "../keys/MockVerificationKey.sol";
import {BaseStandardVerifier} from "../BaseStandardVerifier.sol";

contract MockVerifier is BaseStandardVerifier {
    function getVerificationKeyHash() public pure override(BaseStandardVerifier) returns (bytes32) {
        return MockVerificationKey.verificationKeyHash();
    }

    function loadVerificationKey(uint256 vk, uint256 _omegaInverseLoc) internal pure virtual override {
        MockVerificationKey.loadVerificationKey(vk, _omegaInverseLoc);
    }
}

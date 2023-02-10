// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {VerificationKey28x32} from "../keys/VerificationKey28x32.sol";
import {BaseStandardVerifier} from "../BaseStandardVerifier.sol";

contract Verifier28x32 is BaseStandardVerifier {
    function getVerificationKeyHash() public pure override(BaseStandardVerifier) returns (bytes32) {
        return VerificationKey28x32.verificationKeyHash();
    }

    function loadVerificationKey(uint256 vk, uint256 _omegaInverseLoc) internal pure virtual override {
        VerificationKey28x32.loadVerificationKey(vk, _omegaInverseLoc);
    }
}

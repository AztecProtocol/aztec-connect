// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {VerificationKey1x1} from "../keys/VerificationKey1x1.sol";
import {BaseStandardVerifier} from "../BaseStandardVerifier.sol";

contract Verifier1x1 is BaseStandardVerifier {
    function getVerificationKeyHash() public pure override(BaseStandardVerifier) returns (bytes32) {
        return VerificationKey1x1.verificationKeyHash();
    }

    function loadVerificationKey(uint256 vk, uint256 _omegaInverseLoc) internal pure virtual override {
        VerificationKey1x1.loadVerificationKey(vk, _omegaInverseLoc);
    }
}

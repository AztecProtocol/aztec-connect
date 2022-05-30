// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {StandardTypes} from '../cryptography/StandardTypes.sol';

// Placeholder VK
library VerificationKey {
    function get_verification_key() external pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;
        return vk;
    }
}

// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec

pragma solidity >=0.6.0 <0.8.11;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

// Placeholder VK
library VerificationKey {
    using Bn254Crypto for StandardTypes.G1Point;
    using Bn254Crypto for StandardTypes.G2Point;

    function get_verification_key() external pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;
        return vk;
    }
}

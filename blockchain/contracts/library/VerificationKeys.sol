// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from './Types.sol';
import {Rollup1Vk} from '../keys/Rollup1Vk.sol';
import {Rollup2Vk} from '../keys/Rollup2Vk.sol';

library VerificationKeys {
    function getKeyById(uint256 _keyId) external pure returns (Types.VerificationKey memory) {
        // added in order: qL, qR, qO, qC, qM. x coord first, followed by y coord
        Types.VerificationKey memory vk;

        if (_keyId == 1) {
            vk = Rollup1Vk.get_verification_key();
        } else if (_keyId == 2) {
            vk = Rollup2Vk.get_verification_key();
        }
        return vk;
    }
}

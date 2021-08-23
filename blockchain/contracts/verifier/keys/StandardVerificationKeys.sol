// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';

import {StandardPlonkVk} from '../keys/StandardPlonkVk.sol';
// import {Rollup28x8Vk} from '../keys/Rollup28x8Vk.sol';
// import {Rollup28x16Vk} from '../keys/Rollup28x16Vk.sol';
// import {Rollup28x32Vk} from '../keys/Rollup28x32Vk.sol';

/**
 * @title Verification keys library
 * @dev Used to select the appropriate verification key for the proof in question
 */
library StandardVerificationKeys {
    /**
     * @param _keyId - verification key identifier used to select the appropriate proof's key
     * @return Verification key
     */
    function getKeyById(uint256 _keyId) external pure returns (StandardTypes.VerificationKey memory) {
        // added in order: qL, qR, qO, qC, qM. x coord first, followed by y coord
        StandardTypes.VerificationKey memory vk;

        if (_keyId == 1) {
            vk = StandardPlonkVk.get_verification_key();
        } else if (_keyId == 2) {
            vk = StandardPlonkVk.get_verification_key();
        } else if (_keyId == 4) {
            vk = StandardPlonkVk.get_verification_key();
        } else if (_keyId == 32) {
            vk = StandardPlonkVk.get_verification_key();
        } else if (_keyId == 64) {
            vk = StandardPlonkVk.get_verification_key();
        } else if (_keyId == 128) {
            vk = StandardPlonkVk.get_verification_key();
            // } else if (_keyId == 256) {
            //     vk = StandardPlonkVk.get_verification_key();
            // } else if (_keyId == 512) {
            //     vk = Rollup28x16Vk.get_verification_key();
            // } else if (_keyId == 1024) {
            //     vk = Rollup28x32Vk.get_verification_key();
        } else {
            require(false, 'UNKNOWN_KEY_ID');
        }
        return vk;
    }
}

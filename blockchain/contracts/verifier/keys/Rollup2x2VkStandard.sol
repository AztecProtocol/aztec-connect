// Verification Key Hash: 51371b17443e05d40c9e444fa47a66c2ca2dfdc7774baeabb418665d865ced64
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library Rollup2x2VkStandard {
    using Bn254Crypto for StandardTypes.G1Point;
    using Bn254Crypto for StandardTypes.G2Point;

    function get_verification_key() internal pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 8388608) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d) // vk.work_root
            mstore(add(vk, 0x60),0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2c0fde1cc5b9aa33833731405dd689ec57bfcb80e753e8d1257ce8ab8a2feedd)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x285add4bc37861e94b017b9ece44e453a52e398675ebe7b3851030fcbe3a8d04)
            mstore(mload(add(vk, 0xc0)), 0x25def304a6bcb8864767541fa088c0304119f78d98f6e2211e1a309fd6f4b8ad)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1d255baea20276a4f380a35535d386ffdc8443ce3251f0f9aaa473f5e389fff2)
            mstore(mload(add(vk, 0xe0)), 0x13d757f78a178a6905871c726b498098ad4145175d8dedb55639531d0d0e7409)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x142ed4c9e128b5a8389915301d092ba817db35e774f9010ea593cf5d4c380a5b)
            mstore(mload(add(vk, 0x100)), 0x25f7221103ebe8b095707c222b3db10983c84d602e340a4f25d40b419fda342b)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x231638bb63d0e5099422d6b0e71fa5a0dc850043ae40001361e620465093a803)
            mstore(mload(add(vk, 0x120)), 0x2dd1660cc7baab26c174686d062869568a6bbe3feca4b4aaed4dc8e241305898)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0b7e2d32301036112a9cd07eeb96f6ee5aa5aced5d300db53595d3c8c86a5dc7)
            mstore(mload(add(vk, 0x140)), 0x0febc1a433ff245ccc70a3efc83d827c61ffabdbae36db92b6d2a630404fb94d)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1c5ca6084d9dd1bf15a030ba32d8b0c8c1bf234e2ba2cc1ea167b66e2fca1683)
            mstore(mload(add(vk, 0x160)), 0x26fd9d8cdb23779d08e2763e8d412ec367724873e92a8df681e56b7b15a44cc9)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2bfcb6963425987e1be46726cedf1683a9ba165017a6cd7ea3d97d7aa0203017)
            mstore(mload(add(vk, 0x180)), 0x01ab75e97513c10604a313299ed9b7d276fc717f05bcfec1152ad0a63c6b0fdf)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0d11f8934a2a1b671a737363c23e42fc476c1754d540a94055edbe25e6c6f03f)
            mstore(add(vk, 0x1a0), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x1c0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x1e0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x1e0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

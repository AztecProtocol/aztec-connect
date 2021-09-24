// Verification Key Hash: f20f351f56b167092ef9ab7bccb4d3b5b4339aa977f9b6e6c955bbaad72358c1
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library Rollup1x1VkStandard {
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
            mstore(mload(add(vk, 0xa0)), 0x013d0fcf5e7a97402ead93b4aa4b8d81f84c9298d4c76a3b9e3d7e964e1f0f09)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x12bf5ee5c307ae154a27fadd1be9c0c2637cbab9b409f1344b7cd7359ea165e6)
            mstore(mload(add(vk, 0xc0)), 0x03b99d44a43e3d9058e40aa86edb62b85e34200747395793110e88268e4c94f1)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x293555dde34df50dce63289ee6d2cfd6514003fc830ca6bbcea559def1ad8f74)
            mstore(mload(add(vk, 0xe0)), 0x05bd31a7e58c85cb48c3b7a7bfc2ad0250d7d270915b779d50eadb05bbb5e7fd)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2d89765ae64f02d8862b9fa469939503ac72f23c9e7a62e74eb2da64a0379b96)
            mstore(mload(add(vk, 0x100)), 0x17b86efcd4e3b06fe6990d2153f525732c3088b7751a0377ea478028dabf2f5e)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x06ac3c6beaeb99f90a447ccb0f1cd7694db43bb640c284bffe886b5314f8e4a5)
            mstore(mload(add(vk, 0x120)), 0x1d3ac2ef13b92725ba7f78d211bfe24d127e7a176d37ae7bde1cab28b0a5c60f)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x22f5a7b3eacb27d81dc6fc46617a8cb2630e7248e59fe4f9d7f0e702065abee0)
            mstore(mload(add(vk, 0x140)), 0x109dcee13bed481a52d92a5aba0a19272ed86a5905b1069b9395b94ca09862b0)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x26062cf4bf6b930b3d8015bdce3315e2ceda586611ad9081c61b71ec8454c7cb)
            mstore(mload(add(vk, 0x160)), 0x0404b03627978f4d5bf4689e273353571d64d66d98a6a0cbc7fd866d379d7686)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0c7bc956c7c870fb7b02ed5a7e3b18e19fcd3515e84067a5621a0d2dfd91f92d)
            mstore(mload(add(vk, 0x180)), 0x23eb5c9bbd780ab08e32f0e8d39f8bb28891ee5cbfe2a18204df2d17354d9147)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0f2eb8e1d8eede813b4f3f3dbb129ed79903ec222b336feda2adc515420b7131)
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

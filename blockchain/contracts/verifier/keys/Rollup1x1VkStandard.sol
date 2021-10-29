// Verification Key Hash: 39afbea9daf4c49ee8727930ef93e6193a8ac3527ed9c32945db81f7df983be0
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
            mstore(mload(add(vk, 0xa0)), 0x0b2dc5f30dd4ab5dee5538cc2f21964e100b9c6bd7bc4447f88270ef25cae19c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0e43f9a4cfc9739b16a65b080bb9acf302df91b48f1355b5f092ecee536b7afa)
            mstore(mload(add(vk, 0xc0)), 0x0754a121a839075febdc3715f93922b58bdcbb74d30b892d20521d46c37f68a8)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x068b99c140f2ba1c396833a96a22ce25b73160d9c1a9a0c4d5f0956297dd4c4d)
            mstore(mload(add(vk, 0xe0)), 0x05bd31a7e58c85cb48c3b7a7bfc2ad0250d7d270915b779d50eadb05bbb5e7fd)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2d89765ae64f02d8862b9fa469939503ac72f23c9e7a62e74eb2da64a0379b96)
            mstore(mload(add(vk, 0x100)), 0x15fb0f1a42143f6a90d1f0296d089ad881f400731125209ea5b00971558e8c49)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1ecefa3f37937df6d800032b2901fe71afba8eaad6dc48840e09114fb4c2c55c)
            mstore(mload(add(vk, 0x120)), 0x00d465340e930ddce09e55e231071120910c446192dbdb5de8e9ede43876f99f)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0eea0dbeacb3d3c3a69972dce99a70c78047b2349a739ccd88b44f9c3a51cd42)
            mstore(mload(add(vk, 0x140)), 0x2db4706c4a2fdb83bfac43627429f9ff40126bec8108429a4925bf405a07d9b3)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0c948e80010b8bc34245d491d1310c04b744c8005874aae683b7ce2525ab5cd6)
            mstore(mload(add(vk, 0x160)), 0x1a20288cc9113474abb6964b0736508330835c3e0e1919ecdd07f589543d24d0)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2f7157dfc0c744b8d4b1a8c7f6e0a12b5890bbcedacd86d44bb20a705433f7d4)
            mstore(mload(add(vk, 0x180)), 0x04d2eb111e42ec7748197901462aea4ae9a214114b7758c98105e539646f587c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1e991df3a4385be063f98e4f865b5231f6f2a7ca975968b6943b0b7a45c447aa)
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

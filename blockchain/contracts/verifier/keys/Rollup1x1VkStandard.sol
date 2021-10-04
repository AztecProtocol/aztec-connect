// Verification Key Hash: 0490e8dddbf26fdd13829c31ce0843f42bdb1849743a3c117b6fdcc0683d53a3
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
            mstore(mload(add(vk, 0xa0)), 0x0fcde29f1adced56906167855fbc0e03eaff73aa1f0b53e85e0afe19b4b63f2c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x25ced94c36d37bf4202392b258d9ebde0e06116f64fa2f378bbdac7da97a7ce5)
            mstore(mload(add(vk, 0xc0)), 0x0b12638c9b7746761175c3362de74d662c6eabb6ce346a9e84edcf784c8dac8a)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x13bcc22220f5ef575ff2af7bb5b448c814c2e0d0b14917d45ba7b2d8462ddb2e)
            mstore(mload(add(vk, 0xe0)), 0x16179c0cdb562550daf84b7a3c22965a68337c8c1c8390824357501b3abf7d43)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0b379f9feaa10c7268619c992957293d1debc062e89f428680b7eba7ba291d1a)
            mstore(mload(add(vk, 0x100)), 0x2478dd3854c42ccb5ea2405c138f60296caa4470852b0a9d247af2d05642fcf8)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x296e2d94c80d85a05c3b9ce5404d13cd8092b2e9e35d9b6f218d80bca969cbda)
            mstore(mload(add(vk, 0x120)), 0x2d7eafb5a7daf04f082b32faf2237baa2d97311dabed20a37986eb1de18f52e5)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x089b4062d92485fd9c86e995052af1fa951fdd0d8580fba7015d125fe243d620)
            mstore(mload(add(vk, 0x140)), 0x2cb97391da782e657d504279643434025b9482f603a87611e80c9eb04f71c1af)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x085f9ba292e0f91463eaf514e0a8abd7b1165efb323622406f61f5dd5124eff6)
            mstore(mload(add(vk, 0x160)), 0x04475840dc5379142c93320cbe4417d485890295b6f27f1b49fd214ef412a7a4)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2a2933d362f35852fd58e405c0f8b3a170963f9f8349655e8e8637fa729a099c)
            mstore(mload(add(vk, 0x180)), 0x140ba9ecc6f1f4a8f4610e88eb8267f674d07de02af51118b9ccc94c2ea84f24)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1a61e5ccf3b23ea3cdebc2a710f01865ac71099cddee5e7a0a61ba9b3cfa512d)
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

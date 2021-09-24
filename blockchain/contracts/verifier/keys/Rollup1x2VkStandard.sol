// Verification Key Hash: c7e66c22222288cab60aebd70199ab173795a769be7d1b847721c12f16ee046f
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library Rollup1x2VkStandard {
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
            mstore(mload(add(vk, 0xa0)), 0x2c468d7530c7e6e5285510ed7e7624bf99e047209cba55af1d1c0055d9521591)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x12f095381f509c2507fc22b2ddda473ca91fdc272352f3f382cf073b43e19d5e)
            mstore(mload(add(vk, 0xc0)), 0x1377fe076085ff2c67483e9fa99e25b8dbf332e11848612eab38bf27c5de28f8)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2633eabbd75e27afee7e2f5891b5acd8fdc4702797c49faecb44658468f83e6b)
            mstore(mload(add(vk, 0xe0)), 0x18938aa4eab41716d4381597c2228f14ebd948d3dd76bd64a1a4cbcf7e2b678f)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x040793e1194604022a5af0c3a95bf54a6973e39bd29970f525da299c850f54af)
            mstore(mload(add(vk, 0x100)), 0x25f9fdb8a9351f91af0b8735a530c9d65e2783ddb85f8b946a69e5e3709454fd)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0041746b30fa5910845b5a2257f5b7e052fe73d21f24cf7c9219ff139c596c28)
            mstore(mload(add(vk, 0x120)), 0x2243a2e28f3a2d5414a9d35e5a447bae98fffb9c45cb8d967cc8c9159e398287)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x17c2d4309514235c9478fe1b3401149f6a6c856a609ec2d8019927166250577e)
            mstore(mload(add(vk, 0x140)), 0x01f749aeeceb102efe6cf50130137f4a883b4498cc01c8c39dac1db35773a978)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x04ea3b26691dd8b48f7fd8ff5eb3186682bb5be183ba87c127c82ba4de3195ad)
            mstore(mload(add(vk, 0x160)), 0x1edf6f9df3ed3d796e97fd778a0f961285844e939beba5e7444ee029587a4611)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1c2387704622708c33964884e587eecb8ce8efc57be3470ea08c940c9a99c6eb)
            mstore(mload(add(vk, 0x180)), 0x0dcb4f570f009343e2264490cbc93723546bd2396d91cfeb2753aa05b2217849)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x132a04aad99a7d2fe842ef6a9d5d9a58249311c3e1312ad0c680ec1789080644)
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

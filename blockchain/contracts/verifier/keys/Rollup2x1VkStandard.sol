// Verification Key Hash: 69e7bd5fa2ac377f0bfcb612dda265fe36c5d819b46ddd1a0c4545d68ac022f7
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library Rollup2x1VkStandard {
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
            mstore(mload(add(vk, 0xa0)), 0x20acc92eee7f68b40eb03904422036a208d8622db7cedaf1e0a1fe2fb766bf27)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1a1eb9aab6f3f16860e1247c8ff2676d012e5c3f2a55b4a0836ab495a3333ac5)
            mstore(mload(add(vk, 0xc0)), 0x13424ede806a5db81e0b057c412bbb8f81b7b4ab324afb22a1e736f7d5f416f6)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x01b4331828a5ee1e9a929001e19f02f5ea262207cb5bb41372ba0b41175310b3)
            mstore(mload(add(vk, 0xe0)), 0x218fb0d737ab383052bf24236c270be99f678e302312e8396b1d9787daada6cb)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2f9fa81d55d505eb9ca9cdfa4e2371d747dd1ef8b7f0d8db807f29dbfba3167c)
            mstore(mload(add(vk, 0x100)), 0x2000d84ce7697b3554bf41e096aa5b3cb3900e84d87d94dcf406b48d509e9d92)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x277d9f47d0bf576e5095f9b632e417834ceebb264f6e24883170bba2c0ef3ab3)
            mstore(mload(add(vk, 0x120)), 0x2210de61fce4d8b2e395aa5c8797b23fad788edc1e89043b2b0344f23f14a6f7)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x062399dfbb96179ae95a8e216a2c415162fbd92f1ac7b98eabd055048f6c26c8)
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

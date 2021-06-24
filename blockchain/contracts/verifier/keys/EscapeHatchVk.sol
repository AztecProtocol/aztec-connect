// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library EscapeHatchVk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 524288) // vk.circuit_size
            mstore(add(vk, 0x20), 44) // vk.num_inputs
            mstore(add(vk, 0x40),0x2260e724844bca5251829353968e4915305258418357473a5c1d597f613f6cbd) // vk.work_root
            mstore(add(vk, 0x60),0x3064486657634403844b0eac78ca882cfd284341fcb0615a15cfcd17b14d8201) // vk.domain_inverse
            mstore(add(vk, 0x80),0x06e402c0a314fb67a15cf806664ae1b722dbc0efe66e6c81d98f9924ca535321) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2b6e0c4d8960aecdbb68162bec9396de0984ddf9eab261926da90ab329e52de8)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2cd0e91e6fd1454dbc288621cedb79876476c59be9a0a088068c314adde84fbd)
            mstore(mload(add(vk, 0xc0)), 0x129fa114da09514568edc82ed4c507b4484edb3d072a819bdca980a3c9734f14)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1c0b8983dcea9e6e1f4008685766647cad3ba7ffa0f5712a925547a7f150360a)
            mstore(mload(add(vk, 0xe0)), 0x19e19b5da3be0bd4ff1b58fa89e2f63e50dba29f75e8c8e65a130787d1c4f331)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0855b9fe9da0a209fccf36cc0d09350987041834939d0f02e0db283ff5b5935c)
            mstore(mload(add(vk, 0x100)), 0x129d15935b8dbff7afd7e3a51ebe9bc1637eaa8f8f8df0da9398ec7aa46bf860)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x192d01fa6791435f88188bab33a85298bdc25be1fef4639602cfce674b9f6a2c)
            mstore(mload(add(vk, 0x120)), 0x03f8e29126f864a6ef365628ec1589a39096d16bb29cae1829b11602cd8f186e)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x147bb5b3e215424711c925aa66c614a3ea0faa3282eed9bdd63dd1e6f080698d)
            mstore(mload(add(vk, 0x140)), 0x044ac431af061e7f8caf9df29baae724546f765c45801facfccdbd11222c5306)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x09deba65ce947ea20da0873d7002eafca8d4f735a18e57731f429ae9a894d8cf)
            mstore(mload(add(vk, 0x160)), 0x05f47df9aa992e25aa295a8631e393f72f9cc8c9f3d6a31c48febffa342d0b3d)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x26f2d026ec9ced3818ad14731c02e9580aaf57b11f34744407baadbfb98fc640)
            mstore(mload(add(vk, 0x180)), 0x03fef9a4f51450015ef4566b0aad3cab0451ec8a7064e4b72db14f83283e7eaa)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x16b7dd7de29c0744cbcdb2d734afb1cbb6cb4a50c7c156ddc01759b3c20db028)
            mstore(mload(add(vk, 0x1a0)), 0x144804092ab5222c14a86650dfa5c8c747e15dc1de8a05f5192c0a69ab6dcdd8)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1eeff0d0ae9990788b336eb37ae9894d014042dd12ad12bff94800850d364639)
            mstore(mload(add(vk, 0x1c0)), 0x10f4c10610c00a0fba2f887dd76f7e0721129f5363f5a99fe25bd7a316ac49b4)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0270bec7a34ff77a8b9c708c36d8bcbfb85ddf26fd057e156cce01ba43d343ac)
            mstore(mload(add(vk, 0x1e0)), 0x0f985e5ece3addbb14e9d46cd60181cb3dc80e0f2be384ef9aa427db9b3faa6d)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x18051d5b3398b90c212760dc75485351c594f7f39a0fc1cc909ade48faef6399)
            mstore(mload(add(vk, 0x200)), 0x003a8b775e0dd938258926c70fa551e5a611a0d49cd0c2e12d22aa302b45bef4)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x212fc5d0f021ebbf8f31bf2c4be3b25412d078a6423e7862e2818e4591a9cb3e)
            mstore(mload(add(vk, 0x220)), 0x1d38300c356c74b5d363d3ecac778e9893fc2c70c530680e7598f5a492534841)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2c35b00506f42d534b3a1c76b71596474756a778836c7bb7aad4daf39e2c0d37)
            mstore(mload(add(vk, 0x240)), 0x248788e15f8dfe614f241d25c87035b72088032656d32023ed6206c9e36088af)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0ce87f21ea617e44a8acdc70c600dc3e3effa65750632dcf78c541b91844a6b8)
            mstore(mload(add(vk, 0x260)), 0x2cdceafacbca232d6ba085b204be64f10bc69801b0eed0534b4cbabfdc7f51dc)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x201a03944939ccc280bf692ca5da220952e2fdd34a15636699a29fb3edae11b8)
            mstore(add(vk, 0x280), 0x00) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 0) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

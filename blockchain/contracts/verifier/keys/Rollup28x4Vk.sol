// Verification Key Hash: 3bbcf4fe856e790c3c4c0f4b2bbba8ec53f5b04a54c124fea00d6a532d59607b
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1d82cb5d8370e3cb157bfa780e4f299e6b497061a90e3758c2cda2351054eb6b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0d889f46df570236bee67ed3cd63df7b24e9d539b019d4e688e5d38bd21c4687)
            mstore(mload(add(vk, 0xc0)), 0x283076849ae2539b00ba9392fe2db0cb61d6e33b94aca1cd704923a2d8868fec)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x060c7c448875cbf540ee1e9b11ee3d7da49cb2a1a140aa6db634b31d69f0050f)
            mstore(mload(add(vk, 0xe0)), 0x12f66771409b21e9ed5daf7ed3b46dea92d1f3dec1f3c3c3a056f2f2ebe1980a)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x01f21873605900da98daaaa84007cb73952ff5990ab38d2223ca574fe79d4f25)
            mstore(mload(add(vk, 0x100)), 0x2bc1eb55e6cfac435db347697ff0e02241616890c4aad6a50977c3dd7f83b6d1)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x086b079c32b1793ba352f689f2b4c628c48bcc107089f3dcf3b3db093d19e251)
            mstore(mload(add(vk, 0x120)), 0x263a7e0ca20695ac15a2cd12363d216216eeb5981de37fd6e2db770df8f2cba0)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1bbc316f9f65f212307f4048506a8a5e68ac84336858b9c848d2d4d6a57649fa)
            mstore(mload(add(vk, 0x140)), 0x092ecde5480444e3a83abc5bcfacb9c603776a7ab34fccbce98814316afd23fd)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0696ba8b16ae54239e1e434cfde8cedfd19ac1a69ad556cc405e16d9cf3e9b42)
            mstore(mload(add(vk, 0x160)), 0x1188eca7fca57868a62be6ca73bb43cdf39c4447e0f9284c984b9b6804926d53)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0cf3ed3612c281abd32d683252e10dfe72870be279a3b4b5be4d86d36e9c5624)
            mstore(mload(add(vk, 0x180)), 0x14abe7eda9bec02675dd82a59d0b4b5b727d72c7e0a701e9c15d146adaae31ea)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1be22db204d0af06c7591ec12a6a6711f16f2549467da26559912be2f04d3c13)
            mstore(mload(add(vk, 0x1a0)), 0x268ef3d728365c4fd12cbae1019bac181bae1570895da9e4320bb4ed849683aa)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1eebe1b983046452dc3019a34ad08b613abe69601efafd039dd0ce1a5d90c55a)
            mstore(mload(add(vk, 0x1c0)), 0x2ac51290e54aba4e643aa2081ab32ca23a1463d55b06496c0e59540189e36e53)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0fa2c5b25dbe7db0a60c736987dbcc9e3f4fdd4aa1b625885793f6cf46ff1de1)
            mstore(mload(add(vk, 0x1e0)), 0x00cb4ba7a5e0653dcc3b1b169c02c926e3473c781cb9e92833278412289a2e21)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x29a9d5b6b3b340257186bfedcf97b68ead25c549ff5c73754198db3b044ab64a)
            mstore(mload(add(vk, 0x200)), 0x0efcd79a007c911e85bb148ceb2c1b4fb5079597d263a2dd574b901a256066bf)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x069937581b21dffdab4c2eb7fab15c6e0e329edc5b155ce752ef536afab5b828)
            mstore(mload(add(vk, 0x220)), 0x1cb60195fea79ee7079c081d211264f5ad72de51231853c14d58dd45795d0b92)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0385fed5690d3cd35992348a138ed6a6aad3eee08bd47d89710171711fc44270)
            mstore(mload(add(vk, 0x240)), 0x0e006d16145dbe8501b6b6e65ef9300e62ea2bc731b5294dfd15c49e72b5238b)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1213b87145c17654474f9321a591510b7afcf1247a85ff3d179f4e3d3e819217)
            mstore(mload(add(vk, 0x260)), 0x1cb0a7a6e0c5ff6a0227d21b3c77422604443790ce0770d451ca5112312af915)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0932d11ac1d78627129d4b4231c8ec627f59fc36375500bf1a4269f04b5e2d93)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

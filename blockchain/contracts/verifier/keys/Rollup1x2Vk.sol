// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 54) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x06d47f210b160b5102735df6eccae843d72a99e65282507f6df41181f011e078)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x16f877e449bc80bafcb0f223bf24304b476a0e13ab5555e5135f5a8c1d964eaf)
            mstore(mload(add(vk, 0xc0)), 0x07a12f76d964f14d7d064f484403528b0c76aabee3cd655ea0c2b300e15396ca)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x259dce58d98ef0aa9d8917e1ed2c76d22e3944e9787694d3284db1f6af5a4ca1)
            mstore(mload(add(vk, 0xe0)), 0x2935334f8d66dca95cde79c0ba249bf85bfb496cc89d15673b358585f661b74c)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x02f630cdc5d23314855994e1f5d10f5f15cfb8ca88505917de400d76855b6903)
            mstore(mload(add(vk, 0x100)), 0x0e866ed9b98c49a6f7290bcb4702e445b123cb4d48d1b0f1651845a78363cf39)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1362407a0a3ca84165b50f0163b7ad537fb74ef35715a78c2ee15335158ad1f9)
            mstore(mload(add(vk, 0x120)), 0x207684ab8f134db34ab36dda8988217d940969cc88a2cdf91d2ab75eb3854fa6)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x21966ec719e8b902728edaebf91729393c4747937ae3689240e1e2b70d1d7e24)
            mstore(mload(add(vk, 0x140)), 0x07639d789041e7e90f75f4cf304c71ab72c7adac599f2843190432b767e11444)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x01233798d136e26755cb671131fe5ccdfadbf3952b2117c59f195828080826df)
            mstore(mload(add(vk, 0x160)), 0x0a39a9183bf8c8db871787b310d967419eb487e82f061002cad51c29ca5afac0)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1da65ae88f6175cd44d9e3163cc69675a4e61e130b1513fb3bfcf62c63d15119)
            mstore(mload(add(vk, 0x180)), 0x025f7779e6a5c6e886500edd9b6b39d6dbc28b4c3d717300311d32d63eea6f57)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x160b9904f771f3fcd45ff6e9d70eaffa1f37ba57360cbf67a913e054b0b2ec76)
            mstore(mload(add(vk, 0x1a0)), 0x122d66f6aad21592b73587aae8f88ba29d468bac95ed9f358fd6a8361e5a5882)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2eba75105adf4d2d77dc6f9b8d4df247ea19fb8c70355841dbd512193b80123d)
            mstore(mload(add(vk, 0x1c0)), 0x0ab7e4a21429aef4845c55eba84ac90f21776acbe6c527c5990239ca26c5a0ab)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x22c7c56b739081ec66f3eb41ba0aee8cb2ffe95bc8abe468a786de0772dfcca1)
            mstore(mload(add(vk, 0x1e0)), 0x0bd2a88cae73b8c33d19eeb7813a55070e7dd726c17fd9c85dd29c00041ceab3)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x14ee63b58bb535a8532329706c250b33ee6198c0c0bff1b2eacbbc15a5a59144)
            mstore(mload(add(vk, 0x200)), 0x0ba605d76fb121723f300a34bb352e195c9ea8abb61f9f6418a58e6192b839ce)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x08c5fafc69d127b0021257f3544e1e1587c18e901b1afdadc58190059d0dfe94)
            mstore(mload(add(vk, 0x220)), 0x112b56d39194d18ff9a81eab073301848b33c72cee530904288d171a42b8358a)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x03633427edd7d9e95f02af24ba85f06706e27e5e12b33a187944d17609b70e3e)
            mstore(mload(add(vk, 0x240)), 0x25c515b2e855b0a137c3fcceb56f71222802b9d4f83f08beae66f685ca9d4a00)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x13ee0bb7c7a3a7f3289c16b1bf8544b6549691b0b6b55d0840b13231ac69e17e)
            mstore(mload(add(vk, 0x260)), 0x030ffc55c7db6726ed962349c07d6cdec0232cd42e3d3ed76edbfa5f32576e84)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x158e527265d9f01976e41484929a7b2c2d1d765f4f14d29de6ff7dcd0d275efc)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 38) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

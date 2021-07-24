// Verification Key Hash: b86da59419f8118cbf59f8491d4cdf33f7a70dbb0c08dfc6ccfea39b5e3beeb4
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
            mstore(add(vk, 0x20), 64) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2f4103b4fef2faad2a62950d8e65146d5360a4caffc213d5a5ab9bf8cf08667b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x237d53d5dc15878d4869787fafb13bef6ba906844050730fe73c1883529fab06)
            mstore(mload(add(vk, 0xc0)), 0x04eff8c874e637ca26db1ba34181f65317d26216b2362fae5137db1508df470e)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x26476eacadb4c2926dbbe2c5ee452bb59108f25537345b507082348151e5d520)
            mstore(mload(add(vk, 0xe0)), 0x00e7724190aa359a8ebb2acc358ead94d8d4a1135888fdf59a7a2c96c342fba7)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1cd9a05394c28c0dc4f2c6231644287d7c3f55ec612004ccb7ae8e1def5cebdc)
            mstore(mload(add(vk, 0x100)), 0x2977e9ea45c398ae286fe2cc263313e69892318f6466627bccf2f261bbd6b9c4)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x23645497a1f236107221e2d563b14cd25a19b262ad436d0f6c7caf088efcac13)
            mstore(mload(add(vk, 0x120)), 0x0f3d4b02a020c6cafe039cea4e115ac5ce472111e1ac4d501ffd1eb5fbfbd1f9)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2b3c888fb826f32420ee8adf4afe2eca35cf217cf8a555923045212c9cab8be7)
            mstore(mload(add(vk, 0x140)), 0x022ade46f142639afef0380513374ec0f5ef044c926b55560229193cd88c5de6)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2977d3f874bdd58fae58aa7a998bbf2003ef32dda953f30ebf9d22a23fcb5c68)
            mstore(mload(add(vk, 0x160)), 0x01dae3ba4b3bb98086ba8d9eb6db2dde12e412396549cd293942e87cf290cd91)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x07b2d5fee74573d217e71028a7d18481633426451a2d1bd10b9ea79431e526c7)
            mstore(mload(add(vk, 0x180)), 0x1ff6652de776554a834f1866538b98c9e4eb54c4504744f98ef016da0c33b753)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x12b3ecb9ee592fcce1947015a8bf61c74c6f8680a9499ccf164c78a1abce53e4)
            mstore(mload(add(vk, 0x1a0)), 0x133a50f246be5d4738ebd159547eb271b67660cd743199b3c6d81f97c2e898ba)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0021d059d07745f101c84fee9b18370fba6b7d0da267f207a95eb4971107283d)
            mstore(mload(add(vk, 0x1c0)), 0x14fa1a8602b84b985e93e37d3ce27b1b4fd8a776f380b2b8e3b182352231a17a)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2eb6e9f05c6fec30ab57af0319ed6d0c313769911d17302f09d718fb089af8f7)
            mstore(mload(add(vk, 0x1e0)), 0x08d0d8f6e89d0f89f7e8b78044a12e6679a22165ef45f031b8e679ebfe190563)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x22cb8a4ed4c4f77cf7fbd0b67340ef3b600aad75468e6dc26358b1c9264e46a1)
            mstore(mload(add(vk, 0x200)), 0x04b8bb038a40e614be5b07275205a3c514172b07f1474ffe53baf54171d52313)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0a6f017dc10ac1af93e3b66e4aad6af2de26cbe8c71c77f64ac5f16d3134d7cb)
            mstore(mload(add(vk, 0x220)), 0x262e756d117e599a44e7fbaaaebe17894e9ab878bcefd0327616575fdc69c8ff)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x08b4b6ac95539d16855dd83f08ba04434ff7f6155e34e73cad00a97acabd6a03)
            mstore(mload(add(vk, 0x240)), 0x0faf0d5d8d722dcb607614feab1f9ff15b1443844f57b11c09b62d3f66862c77)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x24eb38991088b48dfa74ecdf23aaff4a4fed72b2f7612d6292ae00ddc1829ea2)
            mstore(mload(add(vk, 0x260)), 0x2564e75216deabff9d5053bd9e5192d382d13b57f57b8b5c1348c36ef7893428)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2eed803ceee4d4ce73ef8d5dd8924a2e7294563fdbf303a50dac31165c1a322d)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 43) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 798) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x128ecc5bb1da7fd8a68aa5c7e72cfe3b42aabce313d1d6645fe4055a7b49ac0c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x01c53dddbed7239dfa98090722b3bbebab0fb95b075e051f64203f07a29a31f7)
            mstore(mload(add(vk, 0xc0)), 0x14dcc8cbd9d47735859662164fc78f4493fc44cd2f3dfe77463a76499612bb0a)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2416a3c737e905ddb9b40ca1bf0f7d07d18c5b37e74df33beab4f91f4f8a745a)
            mstore(mload(add(vk, 0xe0)), 0x1ec0bc5717c0a1e598f5112a3e495c8ba16be8c5b1f3f541d455291f1ef9145a)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2b335e8cfd27683a04d5150d1d58cd2ac9bd7acd492822913e6c879796d27087)
            mstore(mload(add(vk, 0x100)), 0x18da028ce6a296d6a00118efafc33cdb7e8e502e5e091e2541f092ccf827924d)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x15c369108fd2252737b1de1711f63967069540c5e7ba3103d67d6f71a120f02e)
            mstore(mload(add(vk, 0x120)), 0x2b1bbd130ad99391dc200c7bcfbe0b372e4b8793a873349b0725ebf92caeda37)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x096e6e9b8217692ae77c3a9a67fa2cea4a1c2cef667f263bf00fcb7f8c936404)
            mstore(mload(add(vk, 0x140)), 0x07f37f32204c913a18d8ed73676b5adb693c9c112a6fc62189faf2258be58e1d)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2571fb2b82ecbc30c04e00f0933f9ceb8aedd71fb2c80d9f42f016296d59d89f)
            mstore(mload(add(vk, 0x160)), 0x18e6b1da800602780582e885f7dd27e8f8f9577c278747d3372d9a928ae016e9)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x01f0ed702cf9fca094120d6f3c1bb12a4e8c06c8a3056ab97ed1379e320b94f1)
            mstore(mload(add(vk, 0x180)), 0x063b49beebe109a37261cc9ce1dd0d28dce4521a695969eb8dbc37bb53602c82)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x23e13a5eebd3ca90ce15a71410d8242ee114addc99c25ac0567d72e3630ea7cf)
            mstore(mload(add(vk, 0x1a0)), 0x2c26d6ac4b98e625cf31fd0332f8b9e8d69ace15e6d513bfa275ce0045066ff9)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x24596feb9933bb3403eb00429c1bf6519dd7e2dfae4823e0239c02de0ddd3211)
            mstore(mload(add(vk, 0x1c0)), 0x1a4c9bbea280067967f4685cc2ef1eead93ffd01b39133e0791a788fdcd07d22)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x04ebabd89e28b86e67627ea2950dfcd85e40b79561d1717b2654e7d0b5b8dc19)
            mstore(mload(add(vk, 0x1e0)), 0x0c64d466e69580885346203e51b6609e482a61fd1730d672d5bbf04d8aae271a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x29d0a21cc1b3157ef4cdecace69fb7fa568d06cdba742c38b99ceffe55e197ac)
            mstore(mload(add(vk, 0x200)), 0x0ff79f24d2374bb54f69884e0d61211f743020bbdc49311b8735295729b55aef)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2cc9bb4ae2006f624fa856b71ff39e99d04471080904905b79a3560d7bd8b0c1)
            mstore(mload(add(vk, 0x220)), 0x09cc281203ae2f68a664fd11de2acd7e54bfde8715b0744fb2b670179836339f)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x16ca2c9a40d67b32770be2e4e6c0f8c8e6e4f0e04d9aca70f54c96f87a818278)
            mstore(mload(add(vk, 0x240)), 0x2c92afbb51fcb9478f6c2cd28501a0cac267096799f9b49aa77a5c5043205365)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x168e95ca6e96a656c3ff7c296957c59ba6fc2b0980d3ef5f7d4384ff16a96639)
            mstore(mload(add(vk, 0x260)), 0x1f3ea8f987822139bdc9ebfa6d9768762075c72c67a87235422ba5efbc708314)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x12b2e1e2b10c55c832e2b0a1a699f3ea48ae4085238616997d460b382003c00e)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 782) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

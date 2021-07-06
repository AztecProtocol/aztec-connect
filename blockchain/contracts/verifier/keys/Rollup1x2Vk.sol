// Verification Key Hash: 58acb866a60db9c51e572938b04f8b14b7321a553a9ec1e3d2f195c6229bc38b
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
            mstore(add(vk, 0x20), 72) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2334034258fed1cddd494b4e6ad9b89b840fbf1e91fb27c6f86f455452d764ec)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x03db4fe89dec2a66b66022ceac9af3dd231f104c418d6daddc18157050cebc06)
            mstore(mload(add(vk, 0xc0)), 0x0735395da58187ae5ab48985347206e96c5012af47a536652a46ce39169fc16b)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1e1bee8b5112444bdfc3d5c3d20cde2f2c4944094333075d387243a61e821f0e)
            mstore(mload(add(vk, 0xe0)), 0x2278121ac2f3def346c27b808941977553d62bb5584bfc26e4db4c8497efe86d)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x29937248e8366a343500e7681448bff5dfe8f01fd102b425b0f8fb8a69f3f2e8)
            mstore(mload(add(vk, 0x100)), 0x0166339780487197d85e948b176c6f71226ad83f6810c451266d85511a90ebbf)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x239c62cd6233d5ca0a090efd786b3f6ef4fdc630ffabd0873a1c83946f981898)
            mstore(mload(add(vk, 0x120)), 0x1b6a7fbd7383442781c0f28e16c488b362efda07bd6bcde8ad18fe79973e1c17)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0140e35779b650f38d339140c0f7ab8d883f4c3cd72fa4700c4c8956a1b20284)
            mstore(mload(add(vk, 0x140)), 0x03512dc9d4fde1366a4446fd235c648bbee724a4b64027087aade0bcfce0ba92)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x22080fe26fb9037f52232109b75876b77793e1d07d4caca5b46a3ffee28732d6)
            mstore(mload(add(vk, 0x160)), 0x0683e85eba1a2322db18e0af7944b9e2bea8bf57665c83c8b7279002fb3c34c0)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x04610fb236b5038595bf7104ecd8351aab8e4d3748bacb8e59a888fec6c6e34a)
            mstore(mload(add(vk, 0x180)), 0x28836f6e3ac4268887d5148edf2eb227da56748818251cfe732e8925b907d1fe)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x04bc9a8189f2d4d4cbc65ed0043f89f83d5c099cb115f450a40680caa4f8cae4)
            mstore(mload(add(vk, 0x1a0)), 0x035376c492dbfe0197bfb04f6842d4e720c5faf808ca99c87f2506deea55780d)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0d3c4da722b2456bae94344d3ea3980a90133309cccb905c51bea3de9d71fa13)
            mstore(mload(add(vk, 0x1c0)), 0x26dac7bf99ee879ab0181aef201d0ee50a7d0b3fe5e5d15dbdd87d8b154f206d)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x07ac14dd7c11aa221b919750a96c9da78a61ef2ca288bd59c1e32d773c763563)
            mstore(mload(add(vk, 0x1e0)), 0x09da7a05afc160334b089651def4ef53e913bc840887af501db0381945facff8)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x228ebf5592025478f321e33ce908dce5801734c4f4dae3a62ae3b03a9074d789)
            mstore(mload(add(vk, 0x200)), 0x20edbc35e97272e30207768bf628c03e75b1c21fc40fb4c4f673bce4cb131ea9)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1b6baa14dab86d3f6f068447ab9690a4634788e114c58bfab421d5145a90cdf6)
            mstore(mload(add(vk, 0x220)), 0x077a2f3f5ae8333d1432a776e06cf99a105f90d338e8c74f5c7942a94b3e6434)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x18dc3d73dec2b93cb99cb907108ddcfbf4c4c286746fed82302505e9e89acc7e)
            mstore(mload(add(vk, 0x240)), 0x0a936989fa7ffcddc7976237cf4d3f80871ec3501380f380824c1652493a0ee5)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1a4832efecb48d58c8c10de131f971806b90490bc0705508761bbb8edd4b1ba3)
            mstore(mload(add(vk, 0x260)), 0x03d4775ec2e1a44f9f7b6232cb122818ad9fa8e95ee6df1ac7a979d484a471f1)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x12304ddb8c2d9c4f4f1880a57fe71652fc62a14b74149ab0bd87e87ce5d3b98c)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 47) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

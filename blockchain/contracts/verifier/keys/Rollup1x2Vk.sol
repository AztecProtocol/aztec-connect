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
            mstore(mload(add(vk, 0xa0)), 0x2db23fd69404c24a512f684c37f55d87c7277005583a86e40fc9897fa236e411)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2453ae3f3f10c188d51d9069ddbb45181dc2b248715bf57d6150c1b4f3e4068d)
            mstore(mload(add(vk, 0xc0)), 0x0fa2737b2f7b3898a178eb9d14bba63cff0182bf7718b3c42026166fd1aafe68)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0928d3ac99079ad210d8b40432f6c0e48362861ba60c084f6897a97edd4570fd)
            mstore(mload(add(vk, 0xe0)), 0x278a1e99fd9733ed10bbddb335d1e5c1f72eb00753efd67a1465b59a79ad9ac0)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x009361056cb77ca2118f6e102724cac78a49de86a5a2803e095e39139aa796e1)
            mstore(mload(add(vk, 0x100)), 0x0cb33afd7180d5a0f4c3f2ac66e46c1de8c388e66af143b67168c8d9d3e76fb9)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0ea55dc757fb34ea5b3f23b4762612b0688ceb4be60464354ce0576fb778fc38)
            mstore(mload(add(vk, 0x120)), 0x2124b00cec114a15a4d360eedef90e80b2b5028fed2b3fd714a6fdeebf8b29e2)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x155c06af582c4e147072720e5a9ffb79c89a56cff26763f639ca9a670bef4c28)
            mstore(mload(add(vk, 0x140)), 0x1b3023a084a7c677629fa4d6ca8408ede8d1a0531c0c56e0108d25d1235c6c97)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x07989ac504a7cc55da215f3fa4d3aadf28fa17848eb394c79dc044d2890b170e)
            mstore(mload(add(vk, 0x160)), 0x23da856ddadbfcedb5e8f153cd99f7b4a0a527c65c29287b99e710aef6bc5113)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x01f014cd8c23f443b83ddc4c28208222909da5be754ce3836ce476a437a44fa3)
            mstore(mload(add(vk, 0x180)), 0x040b845b2b57b9d86134d28d88682a3e27662c61e5bc7b3e3192c9adf4b86893)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1786c106b9edf491b1b47ac44cff8a62362d9e8417ed92b63e4d9006aa598530)
            mstore(mload(add(vk, 0x1a0)), 0x2d8f312bed9a9a61d8bb5d7c2eaf813271e7f6a47e4351bdb76e43d1eb7c3766)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x031875d25506022afa13d392b55be8aeffaef22e9c6b3e983c07e0b31417bbe0)
            mstore(mload(add(vk, 0x1c0)), 0x1a252a9d8b758bae13b9fe6b6928e1437117d6bab7bf2a89102b63af35569cbb)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2ec1f19fc860917a526223ba956547f5147ffa4dc2699af78b0b5b51d568dc59)
            mstore(mload(add(vk, 0x1e0)), 0x16f3456cd22aa34f1dc3d18879bf633e11e8c468a8213f8445dc852d1919a474)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1934fbdb0d8cb6a15af9a3a5a8b74c4fd0f5666174b3598fa3505250066ec0b7)
            mstore(mload(add(vk, 0x200)), 0x2ca9e1096fac3a2762ae08ed72241a4057a99fc78c22bae249ab289e187197af)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2d38356513d55c3360b7dd5a630b9878548d61658973971af409b3d8dceec0c7)
            mstore(mload(add(vk, 0x220)), 0x18a3e6a0d06a2d7a5d8bf2259a09e22f877005b819fbeacf2349c9bafae45149)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x28db092fd3e2cdbd5fc5996d7884c7f9ff513154535d738f1f637f6d7d5ae6b8)
            mstore(mload(add(vk, 0x240)), 0x0f028086bea6bcacdc3b591fb89493934778a5bff3e1fbf14914a0151c01df4e)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x09b9f971dbce754813940bf47e46472bc73cc825fd119449fa890c8cc00ad454)
            mstore(mload(add(vk, 0x260)), 0x1b67b75f87225c006cc6d6c7cf2fefed1698e11170aa1bed2a16e1088e9d39eb)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2801d83169983f09a4464e5d29d54d95d4a9a7f6305261ca6042480924d81559)
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

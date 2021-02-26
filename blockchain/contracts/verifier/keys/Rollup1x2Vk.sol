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
            mstore(mload(add(vk, 0xa0)), 0x1d13ad067f036f7b6835ff71ddf7ce8461e5ee8a073176a5d2eec2880e1e4194)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x3049f49776312ffddc827c17e160dba10ce16f1408023f1d12d228f4d6f9974c)
            mstore(mload(add(vk, 0xc0)), 0x219b6bd918653613a233fa5ba0c4fc692d3237d2cd33aba04bb21ba8bc120f37)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2ddac179e527f3c66ed644c9f5d5d4e982fa5d4f1a08e584aff04c81cbc53e06)
            mstore(mload(add(vk, 0xe0)), 0x2874a03931ebc3ec83658a4e7a6aea6b6994e8da68e2157af9629899bea0f5e6)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2abfcacdabb3caf0795e4831fcc3146446e2450c427c8937b65edf010fe8a00e)
            mstore(mload(add(vk, 0x100)), 0x2dfca9caf50e90d767f5a68b7ecfc82752c6011ba68118c37d119c0c2887ec47)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1e756162543021c2cdb16e083409dd0c3f9527fc73b65d65385eaede78cbbe61)
            mstore(mload(add(vk, 0x120)), 0x00f6c213b2eef0aceea90c27e0b0e350cf36a2a21a712acbb0ad88016310371d)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x26716655f12a4bbac00915dee1c2151b8d7b902a68e44b25a26f47a99f9274ea)
            mstore(mload(add(vk, 0x140)), 0x16806ff0c438bce6c8e3ac1aa61a453f75696b9ff57a9c561faecf23d78de24e)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x225a04ec57f47dd9bc8efc07a438984862da1ce9433e993f27566614ba221e0a)
            mstore(mload(add(vk, 0x160)), 0x16a8e4f6fbf48a821a087159bc2cba8f8c36eeb5c04126a2eab726c1c01c62eb)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1e70a9a8c70f089b6806e1b00d523077df261dc1aed8ca90438c8018a686fee5)
            mstore(mload(add(vk, 0x180)), 0x1895ef1a566f21da8c95b93d8ae3c0d920db7af590f6c41df2de26c11c7f3b35)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x01a13a95347e23143d52c8c95c80d176fc812685e0ddbe5ff10b7343dce4c61f)
            mstore(mload(add(vk, 0x1a0)), 0x104c7f7665488130081554fc5a7d159133633883c7480dac6f841cf0cd275934)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1fd01fec691179cd0d0ef7da9b589faedd2ef9807edaa49aa0c12738ca56ea9c)
            mstore(mload(add(vk, 0x1c0)), 0x2cb448e7dcde5a70a5b0f5fed37843646cfe3512b9246fabbf3e51ec6e75ff24)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x280573bcde2d93716237b94c0ae6201099a600e1361de62bd2083fa66256eb31)
            mstore(mload(add(vk, 0x1e0)), 0x20c4448fc460258023f509d7fd0d26f638f72d46b3a05f54ceafc67a94b29e71)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x158318fea15185ea59124d26513e0071ff8766bb9fd7f3b3e494df2cf6220c05)
            mstore(mload(add(vk, 0x200)), 0x27e38b8d2a2bf982391650f02d76b074719f99ee42721a431402d14f53b58115)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0dc2a2e770ec49454e426329b87d1e40194a0cf71994d81c8022ac8e8ad24c53)
            mstore(mload(add(vk, 0x220)), 0x15376d447b0bc1fb6c22fe3a2a46d6fbf564b5dddae950266a0e062279a2a362)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0786c9b814a601c78c033752a5186c57bacb9fb292bff6fd83d241cd13562801)
            mstore(mload(add(vk, 0x240)), 0x2a04a60539ba5e01466cde91d0793813f50bf15cf4ffa62f7fe76b7d84f5cce6)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x147f221a17f1dbabf1b289bbfeb689c9b0b7eb63630b6c6ee95b0c9a64e13f8f)
            mstore(mload(add(vk, 0x260)), 0x0cc582c12cb49ca03287d8ad1d6ab069ce12468bebf662ce9c5583f12e5bee4b)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x12a893f7131692ca1119fc11d5fadc5872912837fcf516b64f8703635cfc0ce3)
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

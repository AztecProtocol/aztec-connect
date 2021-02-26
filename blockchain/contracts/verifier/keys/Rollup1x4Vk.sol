// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 78) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x160e6a4586108fee8a7f22b07e4a8624154d39d65ee0fbed8034ae85aa1c5279)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x223562449a7a88c08051309a6817deeee0e54a95ecdc6c5187272246ae122847)
            mstore(mload(add(vk, 0xc0)), 0x195e8a95efb89a44657f9d64484586cd5eeb758f0bad9ac266220f1b4cc845e8)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x177ca44dd3591e42e92abe07baf40a6b57fa3f3434a139a15f5b233d61bb74f3)
            mstore(mload(add(vk, 0xe0)), 0x07045da9858689e08e73cd8326714b797e70be4810b447f906c77d96fe794436)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x059ac2b0595db9e58403c8fadc649e89504f0d6f68ae7735cc3fe384a6ca36f4)
            mstore(mload(add(vk, 0x100)), 0x06d7103241d14a134e31f0acd3ef93ccf51a1358b46314e0cb238a48b155ca59)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x11aabd4945658c422f944b319fa254fab6303a0f3fbb3ac39c127a0620c04125)
            mstore(mload(add(vk, 0x120)), 0x13435d57fe4342bc4779b1c1eadc3ab4597ab754e1ab4e4779f6c0ecba88a687)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x185b2abdf67ff6900e7e87f541706d4c1a4b3e5faa009ba7e9ff885ca2c3800b)
            mstore(mload(add(vk, 0x140)), 0x0d11c50eb658a8fa1faa425ee2def281225ff4d14a1a35a80dd6a2fc1cb10855)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x144df6bea9b59c383c6ed7ca7b390a6864c5d1798c20d028344a7839335b4030)
            mstore(mload(add(vk, 0x160)), 0x23a57379b172e76b42c8a197dab5015d500dc6a27f0653cb2f8a4ff5aeffbf58)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x06c151eab97ba30a793cb7640c25cc545d00773068e42139892280e6b3cf99dc)
            mstore(mload(add(vk, 0x180)), 0x0e9aaff2623c4dddb802514ef5e99dfbfe34819561a012bea365994a58e6fce0)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0a5392b4570bb126f551c95f5ba48f5e687822345987c4d61cc1870bf1cb560a)
            mstore(mload(add(vk, 0x1a0)), 0x077420e28b964721a58d2f8b676db09770a14ebe405524eb786ef471299bea0c)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2ec87e355ea9a6fe661e129945fd4c05d3cce95ac2dc32c766a54fd4565fd995)
            mstore(mload(add(vk, 0x1c0)), 0x1ae39dfb496a35c9e413cc9686165a9fb5a3b688bed6e1ae85d1ba57d633794b)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2de20f8dfb87c84a222f107f881a814313a5e30c7d0b63385a45a98d895d8175)
            mstore(mload(add(vk, 0x1e0)), 0x00681ca5f0148be31656b3ff29af8a6b03569c9f0addcb9d41a4e7d6b7106b51)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0bd744f3059f7ef8d645a8d6204d3c12d008787fcd36c0c4eb79779bbf58a57b)
            mstore(mload(add(vk, 0x200)), 0x2ce9227a023e4d481fa024381cd0f0b3efa79f84a5ed2f037419cc76f71a32df)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1dabb3d66a53247df00cc44884363dce5eb28560cf9f12c53ec20be89ea828f9)
            mstore(mload(add(vk, 0x220)), 0x2f28f547c1e658265711d6e9500f352e43a384f9290a81cd6c7d63058daafc64)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x09b4222870e8a7acf5d1e9565da25bd2a693c660a6bed8230f4a27cf3194b230)
            mstore(mload(add(vk, 0x240)), 0x2d647bbead52a7e6fc6a64588e86aedb4c8e82b0ef8ea83aacf06b37959ddb69)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x14bfd955b808afb90f4d4e99beaa6015d1b4a47354146143b3ebbc7729f65eed)
            mstore(mload(add(vk, 0x260)), 0x069d5a3aee3e963edc76714ea784ee4b6bca821f4cc8889b450b23dc2bf37e5e)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x20ee1cdbf819674d4b737008b6120b526d7ddfed2962733666ca108f15953505)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 62) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

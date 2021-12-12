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
            mstore(mload(add(vk, 0xa0)), 0x0ed021ab3dea29e98ed85f24aa9ababbf5d9b238b35881f67e5a7aa8e1c71066)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x144b423d5bc9e43c5c7a4ca9a8d01189291f9a9cbd28dcbf354091bfe5a35baa)
            mstore(mload(add(vk, 0xc0)), 0x29e3cc9f176a2d860ddfcb6bae60377708e2eb37d7d885988c1e8b6d55ec4493)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x18d5daaf59c77f53eff3a08fe0a42d20ac4fb454b40e09593437505f75fbe119)
            mstore(mload(add(vk, 0xe0)), 0x2f8506e26ed387a5b9e4efd8740091b5359b8395ab5ae9ecee5b0f055e54ec94)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2faa158af12b620c0a4e700ae6ee1bdfcfb6dc18ad13669dbf682da9c0e6be2b)
            mstore(mload(add(vk, 0x100)), 0x2fa760fc1f22dd4ddeded0de4fa1583c4a07e8a75408cb0ef82acad1f0b944f4)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x14939eb8544b267ba56418f13037baeda119c7ad3d755adccdf749bbbfb64fdd)
            mstore(mload(add(vk, 0x120)), 0x12bc548020f5c62776903c212b5fa4fb3f45913ea4f5f574dded11cb874232c1)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1f7008d3734759230d9c766e2b96b3bf78aa16f8250baedb0449943d910fe422)
            mstore(mload(add(vk, 0x140)), 0x205179393446c2c31c1857dc83a83328f9e497c10dc41dc7a9cb01663839baa8)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0521129ae5b7e06fd9dc8920514a1aab95a3aac63a185cc2a3739b094dc92f33)
            mstore(mload(add(vk, 0x160)), 0x05df62d41e85edb98d278100e569de5e7d11b20c2f4dccc1f30aeaff05ec594e)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x09842b41f1c42dd514348aa40dc87898af9b59567fc38d40e224ba10c93f7849)
            mstore(mload(add(vk, 0x180)), 0x033f2d3a75d0ad536533f2ed78975d303359a3f06cc3de95c04e2658c14c6e71)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2ff32f8002a37d230d705d1de15a9131fbbc99f64ad27d9794f8ac99d0aa3cbe)
            mstore(mload(add(vk, 0x1a0)), 0x1add2c3d44c4a72cfe07d898a44eee527b2b3bf384a619e2b595585cb4a4f7ac)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2ed61a90fd7cc96eae92b9f1eced79a8d2222febe5a91aeb2c26e8dc3f19311d)
            mstore(mload(add(vk, 0x1c0)), 0x101f90828e51262448cf1e7270ad0cd43898c7058a407c84c714eafae496310d)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2c157732042d89ac2727e882dc68a149243e470b823250530461256f8258e592)
            mstore(mload(add(vk, 0x1e0)), 0x11aff31b1da1fbb3d8ae090ce00085de4673b4c1ca5c45f5c13f23ef00ee2d98)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x12e4d1363e3b7a4c73424b51b05009c24b646044f807367ecf77b28b4e5aa259)
            mstore(mload(add(vk, 0x200)), 0x087be8860385e0dd844820fa5950df81c018e4a7ede654437c5b7e06755a46ac)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x185b5541f0702802a78ae4ff30c267541177662fecfc4124a58edeb580d3945d)
            mstore(mload(add(vk, 0x220)), 0x26ebe4dc163030178ace75e723f6a0e5e2faed1a4c507945704a4e4c62c2df24)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0ff9ad1cb34f0b5c83aec890fe37fde9b8c45800466622e99a90019e9f2b650b)
            mstore(mload(add(vk, 0x240)), 0x1c26ef44451575098e3829fa64a7ffaa0ffa788a8bdab825ea6b5069cb9d213c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x02b61d5e296349b10b8393dfe85440139eefae5f9565760c58d7621c37627308)
            mstore(mload(add(vk, 0x260)), 0x21e92d332387e853889b36ce394f3e2d1d392b0c4736227774b557e08b9a4132)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1136b489b5e13b32bc8e0c9fd0853f66f69db643641e29a8f2d7d5d395868192)
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

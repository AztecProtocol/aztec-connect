// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 414) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x17d3f4a2ac0533dd99fa33b77eb6714d93be986faba28caeb3dd7b4f3e3f8871)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x027b17d45dd61fe9d3e9c0f2c11b4f1e3d5a6f5d75d20f9e9abfc33474ae8d4a)
            mstore(mload(add(vk, 0xc0)), 0x08e7f21bf2ad26c21f556616b5c1ce08e2e753e499f7d20a47359daccb6f8be5)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x20c1bfdc5cce47ec21ffddd2ccfaf19acdbf90768c3fe543338985876d56a939)
            mstore(mload(add(vk, 0xe0)), 0x198f888e8ab414636d44e07aade430e8e13e20f8f606c306fd85ae32005b917e)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1b8030742fed696820608f0692d92a59954c495c277676b6b586b01d321cb454)
            mstore(mload(add(vk, 0x100)), 0x24f170225fd7569dcec212ab3854a390dadd5908158dc604be644a99fbd020aa)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1922fdd43ceee396ecc853b5b9f75840c9423275ed10325e13507bd3a56ca8ad)
            mstore(mload(add(vk, 0x120)), 0x2ff0bd2b8a3695c8e5d6744934b63a4168f5b008f8f02542760377eb9ec091ea)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1c3c379ff4393bea64bbfc6bf7386145b249f387fdf2b2c01ecb0a86c12a0218)
            mstore(mload(add(vk, 0x140)), 0x025529f2478f861a8d44d4ac741bda329615a591dc5079ca25db3dff177ab2e1)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x215663e4138c943cc935a466ee2ad0fff68168d39865ca0a2681e00f8accef03)
            mstore(mload(add(vk, 0x160)), 0x1e33a7085e3f5aeb04905fc8ec186a776b0fdaa48781e88ed748174cb77d2151)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2d027cd30d493c463e4cd5b824faf0bdcb4adb84da99d5bb8eb7abee68c9d90f)
            mstore(mload(add(vk, 0x180)), 0x0234bdb57026f0f29391273502a878e84566596c5c86dcfc48b96f13b192d0e4)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x011e56653f2c8c87648a8789a4bd89d87cd117d91943c6f5fef36b69b609bfd2)
            mstore(mload(add(vk, 0x1a0)), 0x0dbfa028b7725e3a265bc4e9b81a3673f3ad31b0e1d0d6ebb6b83933221efd46)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x10a9401ede7455864995e42092b64459f8afd0f0adde1713042370b7ce95d48c)
            mstore(mload(add(vk, 0x1c0)), 0x0bffa1c6d75dd184aa06eb363ebbc54da8bb9ba8d77530676accd99aac9bb0c7)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x126113745df8697ba05e5d0ccee227c75e1aab6d1cf559f2de5dc67d3a652ee3)
            mstore(mload(add(vk, 0x1e0)), 0x2c08ec515cef848d88ee08677817c978e841ccca2b146c8b8b612d10ec5478d6)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x050304aae6fbb062c2910fc1ca392f5573181304f28d65cebc69a7a98b35c0d3)
            mstore(mload(add(vk, 0x200)), 0x0ff29c6efc77157837cddd0413c6108068bfc492e5433ae4b057480601b31d3b)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x247a1ef053a643a70bdf0d968941ac0504ffec79599b9ace88c106dc5c27136e)
            mstore(mload(add(vk, 0x220)), 0x0de8b98c2b5217702ed645320469d1851ff230308716a6f564b8f4c78fedda18)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x15c149538a684097db29ef88acc86cba7ee512f113caca3ece138ac1914b58af)
            mstore(mload(add(vk, 0x240)), 0x06305887a57e59b87065126b0d28cecb18d7da40ecced52f62f1c148e8d02410)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0da0e9c3f5b7e47974775efecee2ccd7e52c4e30899036791c5857a4fccc8df0)
            mstore(mload(add(vk, 0x260)), 0x23ce5a334fb424f5aa54beed2db2801d521a387fed00bfc0094f5b15999783a8)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x22e07013d39c790a30c74ea080ea89327d4d131d977037a65898ac01db317ea6)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 398) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

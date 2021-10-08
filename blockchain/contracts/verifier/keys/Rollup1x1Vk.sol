// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 42) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0c592cd40a28a9b726fa641a05b32cd4bf85a61a670ed916719d9b98631eea40)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0de70151d57e35ab11226d58674901b9cc358e76816c479044fb1aa193fc2c36)
            mstore(mload(add(vk, 0xc0)), 0x08002f1293b048e8574cc57bfc9e1a8b0c5c0346d6fa27e9d8ccaead9db86c11)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x28e342275e1f6efb41d18fbbbd5fc10cad938f12433a524a25f37c0aa7a4cff1)
            mstore(mload(add(vk, 0xe0)), 0x182c598275a8bef5cdfe13e33f6f78ee77ed1dd2dd922b891b75ff26fe534ad9)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1802d768f37d7433a3274c7bf3e0a5e3d444b270518d3657fc1797cd993561fd)
            mstore(mload(add(vk, 0x100)), 0x0c16e10a13db828f1a6137846d9420cc11bdcd19edff05f39b9e47b3bf953cc4)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x20bea7e7fe545095d527471ad4126b7e29825b9f793b7346e9f305af5da2eb23)
            mstore(mload(add(vk, 0x120)), 0x21a24f3a3e29898912ae459fa0ab70956ba72568f6342d253418e782b698a889)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x14ed25ebfac646df91a7680393ba7a8e676432cea41b0e7369bb8e015e482768)
            mstore(mload(add(vk, 0x140)), 0x15015be7c1b812fbc9ece949280a3ec00609a804dfc7daa900c521d8c064e741)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0255d44470e7e772c2c4040ef570209ab2146363892e29e33b4504e4d0efedec)
            mstore(mload(add(vk, 0x160)), 0x19dc45657dc291dd01794080df198fb72031216274c916fef072477e82cdd65a)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x114c448181049e16e92839f394c90a6439be6596fc1b9658e12e8896e488d1b0)
            mstore(mload(add(vk, 0x180)), 0x2358a82f2b4ac8dca370633aec9b9a197298cdd9cb3e17a621af87b32ee93757)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2cf113fadcd3e7e063e6578ec0f56d5c46eef945110fd8f2177c8b975fc4cf31)
            mstore(mload(add(vk, 0x1a0)), 0x2464fe0f03bc3bf549ea6ea21682df575c8eee941862d3d902f5bef0c6c5073d)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x16b24942e04cb035a4f3700678045982dfb410130368fc79640e3bf81f3d1695)
            mstore(mload(add(vk, 0x1c0)), 0x22636011e2ce575ead19c67228b4365423e88020d07fcedaa69831bcfa518546)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0dff1aad3f8761befdc296e8dd700858986ebf6a5672d03625ff285fd8dd5baf)
            mstore(mload(add(vk, 0x1e0)), 0x20735c1704fee325f652a4a61b3fe620130f9c868d6430f9ace2a782e4cd474e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x217a0dc7aa32d5ec9f686718931304a9673229626cbfa0d9e30501e546331f4b)
            mstore(mload(add(vk, 0x200)), 0x144e7a07e00015b967c1973319b0d93dfe071bc2b553aee9e9e270d8c4ded794)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x009d72f0cba4835ad2689427d226db036153c215293d87dd6cae7c724e96d6e6)
            mstore(mload(add(vk, 0x220)), 0x026f38fa7477342e5051f82ddb160e1a6f7b89393ce46d6ccb4175d3b1a85cdb)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2cc7671397ee68e45a781377738621544083b88fdf913a73d459b81e3f100128)
            mstore(mload(add(vk, 0x240)), 0x10fe3a0b68848cfc051473affa28fd715432300b19ee6a63b888ec8af68f934f)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0ed93216f720ff1fa89002a463e1da0b47dbfaadd94d1d2966d736e82d1d0207)
            mstore(mload(add(vk, 0x260)), 0x230827e1e5b4c00a206714535a60d4b83c133d75d17117fd6a3ad43c3ca124ea)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1b30c08633f85e929001dea71433b697d8d34153edc21c97dcf8d7dc647b1c01)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 26) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

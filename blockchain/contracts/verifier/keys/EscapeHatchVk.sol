// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library EscapeHatchVk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 524288) // vk.circuit_size
            mstore(add(vk, 0x20), 26) // vk.num_inputs
            mstore(add(vk, 0x40),0x2260e724844bca5251829353968e4915305258418357473a5c1d597f613f6cbd) // vk.work_root
            mstore(add(vk, 0x60),0x3064486657634403844b0eac78ca882cfd284341fcb0615a15cfcd17b14d8201) // vk.domain_inverse
            mstore(add(vk, 0x80),0x06e402c0a314fb67a15cf806664ae1b722dbc0efe66e6c81d98f9924ca535321) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x290b8d025ef832ba1c15c0147293e992410787d68e5f80959e676822934cf4c5)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1204d8e89851a0fcca9b613cdc0d0163b69d93f70664706febe77a56abc5c4f2)
            mstore(mload(add(vk, 0xc0)), 0x188b98c9109cb663f5636202c43dad3c3826381a7c95c13441548817261520ac)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2ccf54971527f9c47165b2bcf5325954b0e455157a96a4a894994fe8af9c5b1d)
            mstore(mload(add(vk, 0xe0)), 0x0d58c89aa3b5bfe281de252714bd760e7d694660ca471669aa400564afa878b2)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x05d811ce51898ba9c3a01eadae0728dfd322bb19f7d57cbc48fbec3ac6b10aec)
            mstore(mload(add(vk, 0x100)), 0x2e7dc6adeb3b3f62d0fac3b2b0c3b726f7f93dbac39fa9f58c7535e54f88377d)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x206226c72bfe3fc476dc92470311ab6006a67503ff6217f134747ce1ea330236)
            mstore(mload(add(vk, 0x120)), 0x24b65466c31f22eacf5eeaa821b61b966dad4c77991d13dd22d1e61efa0bd544)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0e1410a41b907eece55b710e79c97c511fd0890f66b6a192697c047cd0e9d326)
            mstore(mload(add(vk, 0x140)), 0x222b2d5b093b2a779e7b35382ef96999ecc0a0e52939809989aef89986feea78)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x128b78cc42bbd421b7f6f1469bfe5fb7eff2d14ec2707154920463bd09ec64da)
            mstore(mload(add(vk, 0x160)), 0x158dabf7d828c19c0dbf6f8c45b84a4977ae5248ea6e990e61b8c2951f6a8412)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x07478fc30cf185888b86c61792dc9353e370678ca7c30ea50dfadbf75af51e1a)
            mstore(mload(add(vk, 0x180)), 0x1376ac7861b0588c613d38f43f5853ef05a6bc8588f5b6a2129ed595ad0f8212)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0399440aa8aac234a1c646e599c1c61111365dc9f59554fb851625182bc7fb3e)
            mstore(mload(add(vk, 0x1a0)), 0x24ddb45521cac4b1b7a82d08c999ef50f2724c3b7bf5360e627e9539cb5739e2)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0003e99bcc497f0cfbe5a31732f7748b68f99925a6764f682a71d33517574de9)
            mstore(mload(add(vk, 0x1c0)), 0x20d2bb06ac7c559a383cb3837d1f012629658488ddb34e1df1d6697d51e767f1)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0a810c61487cf79c19511179a69fc15905a96c87d359c189f46017d1d026bde6)
            mstore(mload(add(vk, 0x1e0)), 0x21a152ca3054255176f3f5800fee75d8f269e9e271a7f1bb5f3c90db09beacc2)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2b5804d78be43843e7e73e8dde54537f865dc4827a0f9ce6e0c18dd95d8f2cb6)
            mstore(mload(add(vk, 0x200)), 0x1394f7edd7fb557ea04c2178fe79964bad3fcf27c2c6a870f58e795c9220a797)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x23375c4a1a9a89d05088a6ac8236c3d41e831bd6ec6365f320cad8c3dfdd2535)
            mstore(mload(add(vk, 0x220)), 0x27df75ef4c0f777dac6620d9861f75c668f110ef8f2b956991e5fb29983e0132)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1575139bb2e106ddb5eaffdd4a7921bd1cbaf468c23929968d89c188831d3818)
            mstore(mload(add(vk, 0x240)), 0x0fa93fb9f82f7afebc381eb8ea34a3b345ba681bd46fdd1b6bdcd67f3cc36ec3)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0efd9f1464d650e3d7497fa22d69d413e37258ddf906c16486b9f757da4b27da)
            mstore(mload(add(vk, 0x260)), 0x23f4dc16cf2932b87003ab768dee4e1efe679737a34e6a6d7007dbaaed4647ca)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2540d52263daa3452d423c991db42df442b14eacad06fad9afafe0029af3c873)
            mstore(add(vk, 0x280), 0x00) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 0) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

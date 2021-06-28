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
            mstore(mload(add(vk, 0xa0)), 0x10bd711408fe2b61aa9262b4a004dcf2ca130cbc32707b0b912f9f89988c98ba)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x08afbc361df7453c1dd919450bd79220a33b2788b6f95283050bf9c323135c5b)
            mstore(mload(add(vk, 0xc0)), 0x137a7113b310661cf1675a8f8770d5a42207c973b5af1d01a6c032bdf2f29a4a)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1f5b2952576e631b56af8de08eac4f657df5b12accb50c9471a1db88774e90b5)
            mstore(mload(add(vk, 0xe0)), 0x1cef558b208cf3d4f94dfa013a98b95290b868386ef510ca1748f6f98bf10be6)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2446a3863bc0f0f76dd05dd1d42d14bd8bac21d722b77a1f5a5b2d5a579a5234)
            mstore(mload(add(vk, 0x100)), 0x2684bc8456c09dd44dd28e01787220d1f16067ebf7fe761a2e0162f2487bbfe5)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x18196003211bed495d38cbdb609208146170031a8382280a7858085d8a887957)
            mstore(mload(add(vk, 0x120)), 0x2d7c9719e88ebb7b4a2127a6db4b86ad6122a4ef8a1c793fdec3a8973d0b9876)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x297cd6d4531a9ada5d0da740135f7e59bf007a6e43c68e0b3535cca70210bd1e)
            mstore(mload(add(vk, 0x140)), 0x096d40976d338598fc442fb0c1a154d419bca8f9f43eb2015331a97d59565bd1)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x18feffe5bef7a4a8ad9a425c9ae3ccfc57b09fa380994e72ebbbc38b7e1742a0)
            mstore(mload(add(vk, 0x160)), 0x116696fa382e05e33b3cfe33589c21f0ed1e2c943598843118cc537cbf8a7889)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0943908333df3135bf0a2bb95598e8ed63f398850e5e6580f717fb88e5cfdded)
            mstore(mload(add(vk, 0x180)), 0x1eb644a98415205832ee4888b328ad7c677467160a32a5d46e4ab89f9ae778ba)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1d3973861d86d55001f5c08bf4f679c311cea8433625b4a5a76a41fcacca7065)
            mstore(mload(add(vk, 0x1a0)), 0x0f05143ecec847223aff4840177b7893eadfa3a251508a894b8ca4befc97ac94)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1920490f668a36b0d098e057aa3b0ef6a979ed13737d56c7d72782f6cc27ded4)
            mstore(mload(add(vk, 0x1c0)), 0x0f5856acdec453a85cd6f66561bd683f611b945b0efd33b751cb2700d231667a)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x21895e7908d82d86a0742fa431c120b69971d4a3baa00ff74f275e43d972e6af)
            mstore(mload(add(vk, 0x1e0)), 0x01902b1a4652cb8eeaf73c03be6dd9cc46537a64f691358f31598ea108a13b37)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x13484549915a2a4bf652cc3200039c60e5d4e3097632590ac89ade0957f4e474)
            mstore(mload(add(vk, 0x200)), 0x0a8d6da0158244b6ddc8109319cafeb5bf8706b8d0d429f1ffd69841b91d0c9b)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0c3b81b88d53d7f1eb09511e3df867418fe7aca31413843b4369e480779ae965)
            mstore(mload(add(vk, 0x220)), 0x1e2f827d84aedf723ac005cad54e173946fe58f2ee0c6260ca61731c0092c762)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0c42ca9f0857faf0eebbcfc915eefc3616705dc1a0a5f461278c5ea2dd46ad79)
            mstore(mload(add(vk, 0x240)), 0x14664645717286f98d1505681a9ed79ca2f14acbfbd539d04a42c52295569baa)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x156b5ceac5557d202408c6be907fb3604d1bfab9f16f164ebd1eabdb0ebca7f7)
            mstore(mload(add(vk, 0x260)), 0x0f9987c57db930d1d7b18a9389f77b441a75a3c8abdd1f18be9d012cef08f981)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2c2cbc7eb7af7221a6fc921f45295645bcaecc330dd2ea76ab55041bc4aa4514)
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

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
            mstore(mload(add(vk, 0xa0)), 0x167dfa164ea8051fe8d3caf6e0dd8718c69ad2c4b754bcdeb808c3fbd19dd088)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1a8ce899b4d8a9d0d728c61a3ad4b1ac3d6ae6f6f98a53c1590dedb1c3142807)
            mstore(mload(add(vk, 0xc0)), 0x151f88df01ba481c8720621befc1a21930a3b9394b26d86aca5834f5ac271a39)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x190b60e7a742959a51add6b956d6ade25771583a61294234d1d3b306e9cde603)
            mstore(mload(add(vk, 0xe0)), 0x27a17fd4a8787617eea8dfc8b20dc77bd31b8658c5a3848ef723194888e46e8d)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1ccd2064f3eb04ca4fff58ef936e628926d7416220048130c32fafc2a835817c)
            mstore(mload(add(vk, 0x100)), 0x024fca39a0720ce79cfaffba32e3506fd6f3b3613bbabd8d3f854eda5b2129a3)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x081a031a15313f13a3300217d4819a78bf57b9b9874bdbcbb9e032e6728b1368)
            mstore(mload(add(vk, 0x120)), 0x139bb593c49174eba3c1af3a5533cf9d517d4f754408a29924a861826459781d)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1d9357b4ffe18e28f7ad17394a9a577b6d0756175d578b5323d3af138f7844db)
            mstore(mload(add(vk, 0x140)), 0x00be344812b3b1689f64bcc234aa2bdc1f207332c541902dea2fcd8011e495b9)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x094a94359d9288cd9761d0c25408877277863656280ac3b9b3e0e7224958422b)
            mstore(mload(add(vk, 0x160)), 0x0053a6675121d3d58e96718c82e21535cb9ca6f94298e9a7454e1a0ac7836b57)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2d7b5b67f08625b2b7aff6099284cdb40f6adb89ae51117c014bf5b03e8e81e4)
            mstore(mload(add(vk, 0x180)), 0x281b646a9c627019dda79f868641673a1034fb07101e7e40e0c153be2038601a)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2ce6b7da3b3b7e3e4057ac114e81c05b4badccfc2236c54b426db1ad797a767b)
            mstore(mload(add(vk, 0x1a0)), 0x2e724d0d49b224be8152f2cc2357c5f69544fd8347771ca2c8d0725462ec9120)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x064b62b4a79e3f1d53dc2a9e6735dbac5858c9504babd18fb26bd40b66fc7a06)
            mstore(mload(add(vk, 0x1c0)), 0x0cb60a16b181f10a2ebd6620efc8c9abca83b673454465caaf13c5b4a0a7532e)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1e6803db62057a65fa60f742a9df568326325fe8cf319bb1ec50c4aa06c5f0bf)
            mstore(mload(add(vk, 0x1e0)), 0x1dfa7841a99978fc73f5370d307dc727d6ee206bbcad3d155f51659afca79487)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x023274685930d9fc6b8613d2d292af766d2aeb297dcffa7a499b999f88ce7207)
            mstore(mload(add(vk, 0x200)), 0x2449d59b9872969df9af96aafc0fc285f10dc9a2d653493d9ccf4982d6091223)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x211a20620d93527f4a9bba358bff2896103c27034f1a8277cd2b255171feb2a1)
            mstore(mload(add(vk, 0x220)), 0x00e5f0cec1e324d1270d228353acc36d8a2c65ecb19bd8bc9c7abb5240000f44)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x053cea3772c27bd8e7a37a60d2e31db54f2bc7f9c38ac7d5e64f686c1c740b75)
            mstore(mload(add(vk, 0x240)), 0x1823b271e5f7641dab17b11edef82d016a618ef8aedbb00d6ee7b044ff6b4def)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2f5cfba5aa41da6bfca8e5ac4edd07c5fba8ef278b09f4fc99b318f8a8eac447)
            mstore(mload(add(vk, 0x260)), 0x1b519ea25ed67bc5417f16a406f9586101846268e273b476a7acabd85a1a1a5b)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1d5fbfcec43a3a76cfc455781a9a2243388d443369c61cf258a9dc5edf83c380)
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

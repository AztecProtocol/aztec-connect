// Verification Key Hash: ad7fdb9afd3307eaaef7f5954513e40a598909537eae6ffaff6723976e54d092
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
            mstore(add(vk, 0x20), 84) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1107b8c6a9578f9b058f0a03ad39f9727e70754520b22cc1cb51d6b9d0f17b0b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1ecd98c6197460eb16aae70886deaab41fa9e68e82f5381c0362bf3b0bab5ffb)
            mstore(mload(add(vk, 0xc0)), 0x2978c852e404c84b0a63c902f8c9c07301b5ac44f86a9e2339c875fc433c92dc)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x112d961f4a6a6eeda91ecf5b914b6be7625194188be732693cf8e4ec924ce167)
            mstore(mload(add(vk, 0xe0)), 0x00af6e147f1bbfd2e6f738920f70e7cddec1850ef8561aca5bfe0a3d908f9ca3)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2f3b840b7519040258444ae3da640af1af8b5c01ecb84ffec2c9a63cbc7dc4dd)
            mstore(mload(add(vk, 0x100)), 0x24e75bf446a9821b5c20f9e43a9117ab8c93fab91a584cd4fb1c2bf96a882db7)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x15c7dfe5cb685c7350a69ea06198d225e591df835e024a09fe61d26316fa0d20)
            mstore(mload(add(vk, 0x120)), 0x1684e0e2656aa6098701446a25a756216ba0988353437f2844e8851bcdee160b)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x20b5e2b3fe19c9a07b4f9cf8cab35574d8a28e700c05b46115b2a2559e4c5e59)
            mstore(mload(add(vk, 0x140)), 0x091eec97e79191ac46a07cbf3086ae6587f67335c07f08e617785c4076096788)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0249efca9d3dcccbd6483ea0004cda1010eecedbd406ebbd0bfb8e48c964ce0d)
            mstore(mload(add(vk, 0x160)), 0x176ab4df7c1d073922763f4cf3ccc308dc0a2d5651faed292cfd38680f3ab6a1)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2c43374c8a382c29e54bd94994a8ae85e9d98142d56d7fca94bcee6449170204)
            mstore(mload(add(vk, 0x180)), 0x1dbbfc986a2b107206d4f35399619e07fb347ec967e526598594e80c7dd2f830)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x01d56d2ca9b181ee4023d6967d47d460e36801254e3faae4a514b13f71d28f86)
            mstore(mload(add(vk, 0x1a0)), 0x1e4c46138f10b48ba8c685a7cf5aeca7a16ce08e88d121222fc0acc36b5caf27)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x01a847b743636fdd68db4643700125b8b94a7cb0ddd2cd4295e18fded8dcd470)
            mstore(mload(add(vk, 0x1c0)), 0x00e9783f65153a88ec416284ec69240b64ff3ca125c9d16560b3d4280021d68b)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x23f4e97d8310ebee5a3b2b7c33e3b8e6761bc909352649ddb820c4114f7efd49)
            mstore(mload(add(vk, 0x1e0)), 0x1c9fec3bbb9189c19acfef9ffa9907cda7890c1721c7a5cc530b4b0f20a6e84b)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2771d402e7e5bb00a127cb8b63ef651d086116d0c527b7f37b3e8bde8d9add54)
            mstore(mload(add(vk, 0x200)), 0x1a7d1123f7407229e76c4eaf0a58612b15b88516d3d4bf7ca82cb16386b032e4)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1d4064b00d5e1a86c8bea9c35211e7280492c8c007543204d05c526d764d94c8)
            mstore(mload(add(vk, 0x220)), 0x262df40eec4b0ffdb0cf24cd50195028cd7e393662694d6e19c7d9a57323d236)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x286d049913cd10f44a9ca9dca46b7e70e0e3d1796dfd353d7530b629dcb5a941)
            mstore(mload(add(vk, 0x240)), 0x0830ec1472128ecff642451b3c9ab98e347e4a9f96801b95d6f1299e0d16ea51)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0dc74fe62a566300babf881811b8bd65e6330b4eb17c6659847f801327a1b606)
            mstore(mload(add(vk, 0x260)), 0x1df37f32c948a301a880288daeadb1ec2daa66e2c6239179abbb8d89550a858c)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x29f0a9b5703256b0286d9a3c4410385b23f96890bfe86beefd08eb91aa7b378e)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 63) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

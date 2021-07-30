// Verification Key Hash: e52050582c2284a17c5f26c4f6bb49b0fd8bebdba621b485da1f0101a2cca7e8
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
            mstore(add(vk, 0x20), 112) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x22947754c01403ad8fa2d6ecf157b8b5046dafcf15cbf99100caa2e54424c2ca)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0d7f7e1912d853fe1d7a069e8b66e5225b094cd1bb436e608b282b244cbe7cc4)
            mstore(mload(add(vk, 0xc0)), 0x0c14f202e0820c1ade9348756dc4be0f407008e974b7c396e93a86bb69583bc8)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x05ea2e83a2f3e78b9c66be98c873b51cea89c3246ec0d31b4b451f7b946d9977)
            mstore(mload(add(vk, 0xe0)), 0x00372fbeb5d6fc7ea44559a8b2335849e86d695624d2ce5759d425f453bce9f5)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0a4375ad1ccfb256f40abfe958affb8253f3e18e916e2e79388c27ec22afdee2)
            mstore(mload(add(vk, 0x100)), 0x03e6a2e99847adb5c14913dc392128de37ed5638652f5258ac55c4eda88a2ba9)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x290f3d5f46bf4bb1b2d5660abef9ed9d8843fff99188c4a48d54ce6d3666ee78)
            mstore(mload(add(vk, 0x120)), 0x0b147b2b8191e146360d3588b0e0fd1d32ac78a7752a61b473ab99f0e091f7e2)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x21414e5fab50e1e840eb4e1694dbb2549e9d15c0c1b59c2419c50208538f88bd)
            mstore(mload(add(vk, 0x140)), 0x0c5f83cff1547da39471a576eb81b6ae477da1be610796470aadf5f2726aa49a)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x10b171ea10d8aebd81040da86f99f2f46a125576982296ce645a6b7fc76c3ea8)
            mstore(mload(add(vk, 0x160)), 0x103c2f14ebeef245dddbff2dd0f7c86f4dc34b9eacc0f6ff31dffc6d813c395f)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x00a025d4a0feaf92616fabe428798073f2d901ebff463397e2e71857cc5c9a35)
            mstore(mload(add(vk, 0x180)), 0x0240dd831052dac66a3f63943c8673764ccddbecc15d7801d3bfe65d28a7764d)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2abc0c38116ef93d83341de70125ad52c2a13da36352ee65b5a81dacb540bf54)
            mstore(mload(add(vk, 0x1a0)), 0x0f857da05306369a238b320d0c8cb12dd3ede80bda8a1746dbd970527455cb74)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2bf23c3c301f2587eb5c150c720208f8a044903c30b43f21811ff87f06a2125f)
            mstore(mload(add(vk, 0x1c0)), 0x1a2f6412b753302eadd56be20cc911beeb42b693d836a641058dd484638efaae)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x112c80a00caca63d044ef8f8d10aa00a86b01faf3133d914be6af3708315ac65)
            mstore(mload(add(vk, 0x1e0)), 0x18f6b6e467d2470c64cb4f966400179f114fdca6e6034674ceaec77920232c60)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x008f41273155e731d453c6cf4f7577e898f06b41ce91c1fe6dee8f3672e4e3de)
            mstore(mload(add(vk, 0x200)), 0x14c6491e8a9615f8f67225223f4adb5839ad0c981f125b5793e20efb8564c6c6)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1c98ef5e51d5537b1aad17e6d9122f9514ec7aefb9e12b25c14af0d2b9427815)
            mstore(mload(add(vk, 0x220)), 0x118d0368681d8ace177696b6e13852acd897aa4b158b68c29f5b896b5225234c)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x24667b1491a6c8cce6289418e61abf2720bd22deefb7faf1574de0947760a82d)
            mstore(mload(add(vk, 0x240)), 0x274f50ee9796d6a0a6aefcd1978b074cef7f1c6d1d5e218830f17fb17c05ddc6)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x047f5f9da666e855be5f653c072520920bf0426f3a5edb09d80cf7398e82cdec)
            mstore(mload(add(vk, 0x260)), 0x1c5602f7c6f582a7d2ff0477289f04f9da198a5bd009568cb2333369349d5717)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x05ef7f56b11c7ada6e1b7a9aa2cd54537f89537bd1ec992509ff1fdcc71f36bd)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 91) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

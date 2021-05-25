// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 1566) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x26bb602a4eda00566ddd5bbeff4cd2423db0009acc3accf7156606a4245fd845)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1dd8547f013efcfc01a7e40a509b24646595342898c5242abe9b10fb58f1c58b)
            mstore(mload(add(vk, 0xc0)), 0x009bf6f14745eec4f9055a140861a09d49864fda7485b704896de4a6ecdb9551)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x08e79e438a66ef31e7bfb99a1165e43f524bd26f78d4f394599f72b59b8042fd)
            mstore(mload(add(vk, 0xe0)), 0x14b7a43408b0c79f59b52823495cf4ef5e41e217091aac757e7d89bc42e10ae3)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x25a096773133d0ce13cb5c27993a3a4d2bb6e0e1d8f2e04674fec28e9e3c5a28)
            mstore(mload(add(vk, 0x100)), 0x08b6422c5411befe0e6a3a0696a6dda1035fb4738ff25917532076a0a4126af7)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2298cf986a28cb1d0ee774a65f21e976452bfdf2126455424f29d67b267e9a66)
            mstore(mload(add(vk, 0x120)), 0x263505e9368a00c5d18b6b2367a557425010ef995257e28ca1d96734382aa654)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x206c6b0e864976d0cf1af4f23cc0686c18413558fdad150df4da74e07872e469)
            mstore(mload(add(vk, 0x140)), 0x1a01eeee82d343d876b4768c9ff9d6556d46513d115678664f8f1c0d43afbbc3)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x25917c457c81d9f5f4b896233f6265b9d60a359af9df16956e4dbc09763c0bd6)
            mstore(mload(add(vk, 0x160)), 0x17b0ae9b0c736a1979ab82f54fb4d001170dfa76d006103f02c43a67dec91fb3)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2c78125c1d76b79daae8fba3f3a32c1713ecb35bd66b0eebbc7196bfa52b9f57)
            mstore(mload(add(vk, 0x180)), 0x25e1b7ef083b39733b81eb0907e96f617f0fe98f23c5b02bc973433eae02ff77)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0a470bcbe5901d4889d389054d564a2449fa000fec23e0cbff8a1c5b0392152b)
            mstore(mload(add(vk, 0x1a0)), 0x0cd6a83b1c2ca031316875660a0b30c58e356b27cfe63f3d9cb912d128d6a3a5)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x29f1e77dc2a6d16f6208579b9e370864204c7099f05ac168c8b49f8d94e1eea5)
            mstore(mload(add(vk, 0x1c0)), 0x0b33f722b800eb6ccf5fd90efb0354b7093892f48398856e21720a5ba817bef4)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1723e0bad06c4d46d4cb0d643a0634d1fb191a0315672eea80e0f0b909cb4721)
            mstore(mload(add(vk, 0x1e0)), 0x2c1e3dfcae155cfe932bab710d284da6b03cb5d0d2e2bc1a68534213e56f3b9a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1edf920496e650dcf4454ac2b508880f053447b19a83978f915744c979df19b9)
            mstore(mload(add(vk, 0x200)), 0x2419c069c1dfbf281accb738eca695c6ed185ff693668f624887d99cd9bef538)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x22aab8ee870b67caae4805504bcd2965e5eb5397f9c93299ed7081d1a2536578)
            mstore(mload(add(vk, 0x220)), 0x01850320a678501e3dc5aa919e578778d8360ac8ffbc737fb9d62c74bd7b3bf7)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x06baff0bb65569a45146269564e5f679cc9556816a4e6e62a9a822bfa3a9a568)
            mstore(mload(add(vk, 0x240)), 0x056cd85a7ef2cdd00313566df453f131e20dc1fe870845ddef9b4caad32cb87f)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1504f7003446dd2a73b86683d89c735e11cc8aef3de93481ce85c8e70ecb3b22)
            mstore(mload(add(vk, 0x260)), 0x1e4573d2de1aac0427a8492c4c5348f3f8261f36636ff9e509490f958740b0a0)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0a039078c063734e840576e905e6616c67c08253d83c8e0df86ca7a1b5751290)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1550) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

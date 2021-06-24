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
            mstore(add(vk, 0x20), 96) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x12dbe32adede8b52521f9407518d2754235efe84bc5b477577fd96ca2b18d5e5)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x06533b6329d02496b05a1ef619ef2185136132c794f052fe522d54e60a4a5f7e)
            mstore(mload(add(vk, 0xc0)), 0x25b09454f134c9c2ab6b25daece091af5da03600325d511928632f019c9aafad)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x199cb766b2dd9884f91ec23b8355d241d23f1aff8081ce6fd89bc21f70f7ce13)
            mstore(mload(add(vk, 0xe0)), 0x0b1a3f8384db660d4ff4fd3f9f0c3c4ce32b473c8a2ada024ce348afaa3f2e55)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2d7d91c077b219ea0ae9c306c5217fc775f185f2f8ac09babd4a4f44cb588897)
            mstore(mload(add(vk, 0x100)), 0x137036e9e70de268ef7abf52ee65c16d96774cacc9aab41ef10a9fe167a3353c)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2148a7b4293cff96ea7ca0c13355c4245b67c6fdcd6f63aaf5a03fc44d4e7b08)
            mstore(mload(add(vk, 0x120)), 0x2c01b3361c02d95befb96b0661961dd439ecf416c39b54049f9251ce06af7c43)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x03ef14940e37c1692562f270c0e8f676f8bda5640f9b7312879556be2379134a)
            mstore(mload(add(vk, 0x140)), 0x17c0712e6c40e58485ad0e1a621e83a019d74231b79ac89b13deb882e751fbb0)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x09f5c6a8d20cd983df6b60e79a777b813932871bbfbf69e8ad4dc8cb2c7ae49d)
            mstore(mload(add(vk, 0x160)), 0x188fb8d6dbd2147a01c790f5ec9342b53a4b0dea1d9463193ebbb02ec6e6cf29)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x06123f8cc8c07b1a89dfe4083eae1ea6450ade1cebe0e81c8c6a05b0ed867444)
            mstore(mload(add(vk, 0x180)), 0x183e694f6a43088e2c475c106209e13fabdd78928700dea0eb7d830615905c43)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x014f4f7472873cccabe55bafaa04918493f51fb81f7030b1c60191cd6f914f07)
            mstore(mload(add(vk, 0x1a0)), 0x0b6d7a5c8b9b9892b338afd4d15d3b98408c920f6fe32ddfd1167a46a8932467)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x104384cf9a9b722262f1b09d9f1593395101369519b7737a3366b2017f8d88fa)
            mstore(mload(add(vk, 0x1c0)), 0x02a409b177e7a5d91f3069d9bffa814cfc61014bcf9a3b73524a4b4546616c7d)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x18fe8ffd181bc875092ce564aaebd2836da3d29edc2445f8103d7a4a041e5560)
            mstore(mload(add(vk, 0x1e0)), 0x245ca752e1ad1772cb62eda83790926a7aed3caf3b224ff541834fd81c12e7c6)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x02db1773b09124542a0d91b711fbd3571f413eb2725798047dfee29d2e406239)
            mstore(mload(add(vk, 0x200)), 0x25ba38d37d86fc14a489f2e179205dfe01100524b88b9bce6bf2b630e6b4fdda)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1c556948961559da9b9b6f0b37c702255504d11f71a600a7fdabad5dc775747d)
            mstore(mload(add(vk, 0x220)), 0x040e9c68b986d2a506009dfe7109f7f6759e89e2fc248c0a436201315150ba22)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2c8ae62a8ecdfb17fcafd72320e65e38cfe46f41c58b216b5dae304a694ec214)
            mstore(mload(add(vk, 0x240)), 0x0b4120400f89e4d130921061ff54fa1cc1aaf300d338cd13106b4ec89aad6983)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x01e09d6914fde7ca2c12775aa8d91998cf931272fda2bda74cc31ac5f4442eee)
            mstore(mload(add(vk, 0x260)), 0x077c2461b21e949ce88af6cbdaf8f6a8eb5e393f0c1ffffac4889fe497bca06e)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x09f09d37d247d358490e62b1a95d97179a36d4c15cfe9b4d6cf8ed6e7ed9ee4c)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 71) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

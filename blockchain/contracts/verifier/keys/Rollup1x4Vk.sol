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
            mstore(mload(add(vk, 0xa0)), 0x2d0259602285e01a97b3de93d8a7d29a8187723fe022f91a388b1389fbdaf8ed)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x22a1eab6c58e7fd7d7e120faad863bd46d3dedc6c6cf895197ea51e646d39cbd)
            mstore(mload(add(vk, 0xc0)), 0x2e97cca15cda8443e118a675d704db222ad6b37b1a3ed08f9ef083ee63da3fb9)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1232cecbcd30176ea15d62ea4900438fdb39fcbbf69c4c0d4836dab7d0a143c8)
            mstore(mload(add(vk, 0xe0)), 0x0b1a3f8384db660d4ff4fd3f9f0c3c4ce32b473c8a2ada024ce348afaa3f2e55)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2d7d91c077b219ea0ae9c306c5217fc775f185f2f8ac09babd4a4f44cb588897)
            mstore(mload(add(vk, 0x100)), 0x137036e9e70de268ef7abf52ee65c16d96774cacc9aab41ef10a9fe167a3353c)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2148a7b4293cff96ea7ca0c13355c4245b67c6fdcd6f63aaf5a03fc44d4e7b08)
            mstore(mload(add(vk, 0x120)), 0x2c01b3361c02d95befb96b0661961dd439ecf416c39b54049f9251ce06af7c43)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x03ef14940e37c1692562f270c0e8f676f8bda5640f9b7312879556be2379134a)
            mstore(mload(add(vk, 0x140)), 0x17c0712e6c40e58485ad0e1a621e83a019d74231b79ac89b13deb882e751fbb0)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x09f5c6a8d20cd983df6b60e79a777b813932871bbfbf69e8ad4dc8cb2c7ae49d)
            mstore(mload(add(vk, 0x160)), 0x02a213fcdf71e1e5d1d88952c54f547ab294975f9063a9530fad0392fc31d6f9)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2e885a2e4250425a6357ab68409521e8f03392e0d6870c9cb3f189a46c348f07)
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
            mstore(mload(add(vk, 0x220)), 0x1fc5d192e1dfc25c9f3c2e781670a76974f82b8f29d6f1ac6d27b620e38d6bd6)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x14b27bfd32925ef04244f539811ab9e332d8502e270e111b466806a7cbf7d267)
            mstore(mload(add(vk, 0x240)), 0x1ebda3e3823f760d8cc6798b2bef598acf706ceb01def6675cda98aef74b3923)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x15f9200d77f7805576a4eee5652dd07fb114c5f912bd770cff360f28458baf89)
            mstore(mload(add(vk, 0x260)), 0x29c68b312a1ce954dcc2a4389a1ca19dd63f0cf46e0c94669ad3b48e87ba45a0)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x11e4d3949152503180230d3be249fa6349224bb6556f9bf0c108767a6be794c7)
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

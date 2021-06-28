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
            mstore(mload(add(vk, 0xa0)), 0x0f282a82d00f5cf8eb0913dd30f59241a10da98c40edb29d8fc4f08cdc104578)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x089415b2d0c58d17d0c044a43195f9e5e2d173ca597ff6e7992e6315be8028f4)
            mstore(mload(add(vk, 0xc0)), 0x12d9a7f92a8e847ca6a7146b56bb68b9aa2c7082a9ba99c9f5932faec20b4508)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x193475beb07a09815f60d825e1761c3dd5dd4d7699c80d966dca9df6311408a1)
            mstore(mload(add(vk, 0xe0)), 0x080bff6d422f26717b7f275083fdd278363c2bdab74380450cb93048886e0147)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x16a281f9c38650b1ee411c16da05cd0440ab32eea9eb254eb8a1d77a4cb91c98)
            mstore(mload(add(vk, 0x100)), 0x131266f84270dd962bec279fe4cc145662c5edc2bef1f9350cd0e0e0e6ab56b5)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x05f8f71eb19d4321b7699666268dad1971e45caa47587c8ee5976358c5d694ae)
            mstore(mload(add(vk, 0x120)), 0x1b6397f9b910169ba2102852b6e602f74e4135c6030edb788b13f0520ad4c7af)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x29d6e24af459e983c22dafdbbc76fb4cabb79ce8267f21c449c3d8a7a5f79bf8)
            mstore(mload(add(vk, 0x140)), 0x0a9e91ccf30209d981703ce3793c0cfede9577d7bebe2741dba735d0fabcda52)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1c62787610580dff015f8c96000a6ade2f538ee2b5f4bb0201f99f7ece8102f2)
            mstore(mload(add(vk, 0x160)), 0x22e7ad6878da5ad8c442c11ea757c9c7a9253ab10587f14c62eb39893442b842)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x187459ea60868f18fd16bccf0095edff5dbdd5b6a68b7e03014442ef256a992d)
            mstore(mload(add(vk, 0x180)), 0x183e694f6a43088e2c475c106209e13fabdd78928700dea0eb7d830615905c43)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x014f4f7472873cccabe55bafaa04918493f51fb81f7030b1c60191cd6f914f07)
            mstore(mload(add(vk, 0x1a0)), 0x1d03000048b01cae51d41efda5c31f4c50e731e6e0f7bb6619fc6d353d454d90)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x101d7936e1377370630d720e022768280d9b1d4aa4d0edeb01d0ba275338c99b)
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

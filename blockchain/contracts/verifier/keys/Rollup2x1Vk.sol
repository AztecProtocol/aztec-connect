// Verification Key Hash: c150781a5b42405323aad6df3f1895febbe93a1e4b38abd81dda56fa2e710dc1
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup2x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x09633e918f698883700ed4924304045e6353db2979f114654b68c0ddabcabc49)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0542d601567e09933b9a95f3f0dbb0c8a890e0ed11e8f288d948aa6fd5f1c3d0)
            mstore(mload(add(vk, 0xc0)), 0x06894c3e2a2148eb52f8a29da507bcd35cafca879fd52ba812015dd549f3dca9)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x05a04a0c44113eeb95cdb55b5af4f9f3e0164897e622bb98765fe220b8408f6f)
            mstore(mload(add(vk, 0xe0)), 0x210d591a3262a98b7f8778e927faa7305eb62a58628b696e3e3595ee1b08aaac)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0e4e8e0efd39903dfedea4baaa8d4a87313d0afb7b6d4e13518154ab8814b659)
            mstore(mload(add(vk, 0x100)), 0x1868462c959766239ffe3fcf003c4f287fcbaaeba7eb8dae129c7f772b5b3175)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x304981c7ff73b38daaa89f2b9219bc6f0443c1a6df37fcfb35ffea88b44907dc)
            mstore(mload(add(vk, 0x120)), 0x03a9d78e34a4e6ac09e1c818c40bf3fa63041ee4bcd8baa0b713df66f37a3593)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0d18006571d2eb8828c36f94bb66bbf9a99b73d6fad5f7dac6e11232d7598536)
            mstore(mload(add(vk, 0x140)), 0x228e98fd220f92679bd29396858443c7d2a8e4b5f597011d808ef878638580c9)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x06c4a4eba82b16106d37c9f10cdccf5f0e48f69bea568911d1c395cc6cc49423)
            mstore(mload(add(vk, 0x160)), 0x2145c6065028249b7d2e2ff5fcfc725c6ae33066f2a62b87fe0f50964a6121f0)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x16752b1709f497609522a288ab539423640300f7c82640a4bce8a46f631f4a08)
            mstore(mload(add(vk, 0x180)), 0x2d59b2bcf896d8082a28a7e6714a9520825be4686ab383d27189e63302baf869)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2601013b2567a493ff36367d494baae7e12955783b9b46fab3fcf29d36eed196)
            mstore(mload(add(vk, 0x1a0)), 0x1b6071b44b58c7d3cf58a650c95e1a0795d2dba9161f221ca6223c53adeae529)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0dd08ae34e15e6288f5438d1453fea65b11221f2c4857342fdc08a9caf6f3177)
            mstore(mload(add(vk, 0x1c0)), 0x17161829e1db1344c444eada76769305c9780813792656b7f48af37bc91b3673)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2e9198b10c0fe7c5ee7543425c8afa2f0261c5a6e1148c07d08bb75778a83f41)
            mstore(mload(add(vk, 0x1e0)), 0x10c7f7081879b18b0ab8319111c6da86d44e577b6674b8fce6f5041789cdc8a8)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x266147f04a80c600e4c356a1c11b1160cc16615124ddf5101fee823a2c56c4ac)
            mstore(mload(add(vk, 0x200)), 0x04b8de6d1a36cdf00b5f2bc71441afec8ad25c588c94c7627a7bf756a21d66ee)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x25b02987009f5cdf7d6a1cd773c64b54aac2385c642a5a2866b527f86a248b60)
            mstore(mload(add(vk, 0x220)), 0x1f1d0c9411673f0bcf6b5b434fad618878b119ecb69850d5e3b7623e3bc7fced)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x211710bf03aa8fa7b557022be854cc5b5ffe24abc72b4b667a3b064bd4e28476)
            mstore(mload(add(vk, 0x240)), 0x1dcbaa9a7bb3d2d18581840d643ee1b1f0a05f621762e7964a7249a97f8895a5)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x05d76d92645af9d49ba534f2a6fd58b6fe9f7ff4a952c496363e82aa8d9a4c58)
            mstore(mload(add(vk, 0x260)), 0x100d584da4d2c4d994d7da27528f4d4d540d21a9adfae0cd8ba8e7efdb34771b)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0cf9cc11e8918de3f8fc4456fba4957b32102e2c28bcfe28fce5388262706477)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

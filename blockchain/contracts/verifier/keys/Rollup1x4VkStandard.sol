// Verification Key Hash: c5d3217a05ee139a9fe155d531d3393e4d75333f6bc33ef9f6154304a4eb8bb2
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library Rollup1x4VkStandard {
    using Bn254Crypto for StandardTypes.G1Point;
    using Bn254Crypto for StandardTypes.G2Point;

    function get_verification_key() internal pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 8388608) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d) // vk.work_root
            mstore(add(vk, 0x60),0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1bb4137d18595fb60900c5d4de52c3835662e005903d0cc2032786bde574ff42)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x29b645113c7d518ad9fa702cab704e42be74f66070c1edae24610d8e68fb02b9)
            mstore(mload(add(vk, 0xc0)), 0x0a6243f8e24e2c38575a70e353c8da0f07d07bfdd6b7049de6553beb7b8f4f55)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x30344fcae5de6a08b36f48d4a5e86cd20f1cd61b26023cfc96baa7f6ebfa7a8c)
            mstore(mload(add(vk, 0xe0)), 0x21db226177e4cd3453ec44551d2e7d5088fe152fffe7cbbf8a6ebb617dea39b7)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1b860757d4c8b64bbdcf9c6f1e9e555c5d8255ee342c3e6b3db341fbe1280b0a)
            mstore(mload(add(vk, 0x100)), 0x0afbb6da58621cfcaee45e23b0110752d1f272da8fbbe269c5a790310851793e)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0aa2a2e80f339eb4ed0f64eab9690a2add0199e7b26db64f4b3b1ae0cc12c6c6)
            mstore(mload(add(vk, 0x120)), 0x291ab2d79512cb56cfb3ecbc7a05c73acde3a61990a13be5236067d880020784)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x02fb99f63e42d17426ef142cfc5567dbf177bfdc735371749d75ae9000730fe2)
            mstore(mload(add(vk, 0x140)), 0x0266ca9f4450ecde3b0f8ccf6f56cffa31b19afdc10fe521ca37f1ff57752829)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x07902e8af148aa30ab25d6f3a03d46070881062ac408f8f805d64eefb494bb23)
            mstore(mload(add(vk, 0x160)), 0x28158d17b023c6dbdaf07edbf80a83c0591a756706ff4773c2d6c7bfd720df66)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x28c80cd13428244cd0e2041d311607378a48bdb96244b2474ff381e290aeb025)
            mstore(mload(add(vk, 0x180)), 0x0dd4082e956e9c2bd9c4e62dd1342f4d382b81cac13636498a38590b6b8cfd49)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x16457e97a413769032b5fbd5e8bf051c68c67c19898af27e5e5423d0f4bbc6a4)
            mstore(add(vk, 0x1a0), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x1c0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x1e0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x1e0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

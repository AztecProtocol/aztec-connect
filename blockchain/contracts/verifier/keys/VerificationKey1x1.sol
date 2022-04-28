// Verification Key Hash: 1f29c032538068d5b841a5e38897c3b4546339355cdb75bdb7f5b2b143a6966f
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2021 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.11;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library VerificationKey1x1 {
    using Bn254Crypto for StandardTypes.G1Point;
    using Bn254Crypto for StandardTypes.G2Point;

    function get_verification_key() external pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 8388608) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d) // vk.work_root
            mstore(add(vk, 0x60),0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0f7c715011823362f824b9de259a685032eedb928431724439a567967852d773)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x17ec42a324359512a7d093faa7e55103b1f017af1bfaa5e1ccd31cc9e4ff8df0)
            mstore(mload(add(vk, 0xc0)), 0x3010206be637307bc068ce5169be29f803e7fd6c2b69f653ca3b745864d30996)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0de1236425db4e2287118dec6d53937eb1cb8d3b4a0e3816ef3d9c61aa394cf0)
            mstore(mload(add(vk, 0xe0)), 0x07c448ca9631b9d24fc45d555f1b1952134eaf083c3bd46a000fcf5434a94478)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0e18227b6c1a461c1cbb59826cac7ebabe89e6490d80312be1504d0f7fb98059)
            mstore(mload(add(vk, 0x100)), 0x24a14b8c3bc0ee2a31a5a8bb1c69a1519a814de7c78cb5fe3248b1717893e7f8)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1abd8e73735327575cec64e8d3c20fe5ae58f23468478a9dc6aee652332ed569)
            mstore(mload(add(vk, 0x120)), 0x1531778c4bbda77a659dd68bf49102ceb1ab6fbd96fd5cc2f7f335e3c1ec2ce5)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x166f3cd25cc14370885bf52637ff5dc382c8a6243f552cfb96a09a64f314631f)
            mstore(mload(add(vk, 0x140)), 0x289dcb3bb09ce8d1a5c6d08cdf87ba9fc0f22ea255cf644523a602e6d3ae348e)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2d21049d7f8b99c666d353e6f7101663ed09b4877f0a829d275bb83c223d1076)
            mstore(mload(add(vk, 0x160)), 0x0d4e31a8d510770f6912e7ee0f7454ecaf51b4df1c5f5865e0017023eab933c8)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0f974eb06e1bae83bf339bc7d15b5ea18d826aa4c877ca1b63317e2a8debe7d1)
            mstore(mload(add(vk, 0x180)), 0x2d1d6ae2a57defc6f3a789129f67f9c9969961b8642a92b91a9bdc0afb8b7f99)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x300c3f15de1f550c772a7306a3a7e491b84ec7e7a9d4601c8b88107eff4f45ee)
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

// Verification Key Hash: e8de471c4e09af448b43fe86417dd66838de7a5f3646c3ddf863b3a68ade215c
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library Rollup1x1VkStandard {
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
            mstore(mload(add(vk, 0xa0)), 0x07b19bfd364e2482c270b95869c7b717bc9ea939b47feca825b998fbf57b39bd)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2b20eb5196f5d527ce46dd501896cf202e343804a2c43707dee0e8ac3cf6a53e)
            mstore(mload(add(vk, 0xc0)), 0x2af15cc28d8df4e92c1be6dcb5cc36cbff8b7b061550a63dc894981ed7287cdd)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x068410edc63f67a0a307a4ca2127df529f91925927c1ca396de542c7d01d2a04)
            mstore(mload(add(vk, 0xe0)), 0x218fb0d737ab383052bf24236c270be99f678e302312e8396b1d9787daada6cb)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2f9fa81d55d505eb9ca9cdfa4e2371d747dd1ef8b7f0d8db807f29dbfba3167c)
            mstore(mload(add(vk, 0x100)), 0x15efffa7d2892de2d870e7f5abb9bffd6e6b691d7f37acf414c20b7720af0c3c)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1da0d47e2b8be113fb64ebeb5a8e67e67033608bbd4eec5e97f55ca07578b848)
            mstore(mload(add(vk, 0x120)), 0x00a7c5f0b64b7620c0ae4ce5bd455d6f082fa4cff6eb3701dcdf74dbb2ca8f30)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2318db1537d064a8439e8c8da8b9fbcb3164b9b725447ec8c2a54cedcb7e2c15)
            mstore(mload(add(vk, 0x140)), 0x27e206f49fdae148663caca241e0bb1cb9cf1d5c351405ecc96ec54311af9819)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x038d32af1eabec7d08a7aadc7bf2d5685d78b475cf0c83689381b830a0484694)
            mstore(mload(add(vk, 0x160)), 0x043754b469a35d95ba521f35f83e1c570d03b931183ed612e0d5e429644fff3e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2f1ed96fe4c2e16c84843cd96576528b5be7c22a5efe882d4161ce9de40e4919)
            mstore(mload(add(vk, 0x180)), 0x17359c74a3c08d827fda64e56c0265792223e01725dfdc3fd8a7aac8c9b50747)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0b0da4b0c133b14401affa9f569d9a9fa0404659d8061265cd80e0cfb1a91076)
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

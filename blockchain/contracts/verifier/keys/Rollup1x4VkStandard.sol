// Verification Key Hash: bb975d1c127414b6348d579577aef2185252989e17ca8df3d32aaa1e741c92ed
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
            mstore(mload(add(vk, 0xa0)), 0x2276047960955b11846a080b31c5c48289656074e2e17a769b75e36cbc97ba1a)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x24a51f102d4e63f109301a35fa6f41573aea1fb259bb332e40db858a8d68a264)
            mstore(mload(add(vk, 0xc0)), 0x1a68c992103006ea46a05caa54ab0f82784b79f52f39e07796007d350dd972a7)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2eff03a0fbfcda93754add3769b62ca7e3b12b64a964a59e3b93b319c23ee5bf)
            mstore(mload(add(vk, 0xe0)), 0x27adb0570f43a87f98cadacbbcd136286a2e251e8a0988f6c2bc8d9f24d20f7d)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1b37a55ddd09a161844c4d7545db51f426226510760a20b1773e866df367baff)
            mstore(mload(add(vk, 0x100)), 0x0e4051ddf0290ba7cccfbb71f138b82f81423d4cbd9d6c3d8d6a5e64dc2182c4)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1627b9578652f5acd0136119243e61ee40439d1235ebd0f8036512d6ed9f5c57)
            mstore(mload(add(vk, 0x120)), 0x08f08da67fa7dd077552f360d1c4c57ec814c89442ff6a4de5b1885dde6dcf18)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x02467a8a811b8b02f637430811168bdce7011a338cba69fff217febda4989731)
            mstore(mload(add(vk, 0x140)), 0x2db4706c4a2fdb83bfac43627429f9ff40126bec8108429a4925bf405a07d9b3)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0c948e80010b8bc34245d491d1310c04b744c8005874aae683b7ce2525ab5cd6)
            mstore(mload(add(vk, 0x160)), 0x1a20288cc9113474abb6964b0736508330835c3e0e1919ecdd07f589543d24d0)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2f7157dfc0c744b8d4b1a8c7f6e0a12b5890bbcedacd86d44bb20a705433f7d4)
            mstore(mload(add(vk, 0x180)), 0x04d2eb111e42ec7748197901462aea4ae9a214114b7758c98105e539646f587c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1e991df3a4385be063f98e4f865b5231f6f2a7ca975968b6943b0b7a45c447aa)
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

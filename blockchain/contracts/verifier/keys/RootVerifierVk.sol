// Verification Key Hash: 6065acdb63162cf2bc4c76775397f28d146c05fb31ce529508992daa98760438
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2021 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library RootVerifierVk {
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
            mstore(mload(add(vk, 0xa0)), 0x0cdf188de7b607fc71f27acf2cf3b09f04f6513e68e7c15aecdcaf3a59d494f8)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1160a977c7fcd64b7a1d843604c1ad1bafa9fabac35704bad44a452a31d8eeae)
            mstore(mload(add(vk, 0xc0)), 0x1399e8a481b85e873b927bf86b1af1a49f0d61b9e86df8325b6a4895aa0a1b66)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x216b2aa97f3d41ee36dcb2e6e9db67ac2e07c6cf790018e46558574849764cd1)
            mstore(mload(add(vk, 0xe0)), 0x21a15a83f1ece891b6e0478cd28b5225ea4051b9a1668cbeed2ea1701874e70c)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x22ab06fffbf360ef54139a3c666c85387c36c49b207ca3f4d72ec06fb3efa110)
            mstore(mload(add(vk, 0x100)), 0x0ad4ff8e0acd928bb6bf3a9f4756f4fa7d142c37f1a0f4f87f7219638a2a1da4)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x01ba625d1330c9a17d1430b54bdb0dfa78322933ac93f17709ae50fa485a3589)
            mstore(mload(add(vk, 0x120)), 0x221cb4832fdf22d26e448fff08844566c36897e68b23d95db57fcbdea86ebbf3)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1fe6c18953d0005ae6e9c32cafbf5e8170db1c48c7eebe9921e0dd0355dd707f)
            mstore(mload(add(vk, 0x140)), 0x1bfa41ce8eb2c653176b226e32e70e4730e7c8b683aaafdac69de8b322dfbc56)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0830161a7f0b5863d10cb63c6a6ecc909365640a3ac14b7b37b814246877f2cd)
            mstore(mload(add(vk, 0x160)), 0x2949aa9501674b2a964d74b68f41210d78cde24c6758e2e69b0bb79471599cdc)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2bc8de2cf858e33ccd2f97972af09e9a2d62c6988f89229e8c58bf7cffaaf520)
            mstore(mload(add(vk, 0x180)), 0x1a15564a2d13c54477cc875f39be55006221a8943243d02a547ed0245d1bfa74)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x06c756095d659178c9a0067a4f97dd3aad6c60589dca1415456731b5dfb07e71)
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

// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {StandardTypes} from '../cryptography/StandardTypes.sol';

library MockVerificationKey {
    function get_verification_key() external pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 8192) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40), 0x006fab49b869ae62001deac878b2667bd31bf3e28e3a2d764aa49b8d9bbdd310) // vk.work_root
            mstore(add(vk, 0x60), 0x3062cb506d9a969cb702833453cd4c52654aa6a93775a2c5bf57d68443608001) // vk.domain_inverse
            mstore(add(vk, 0x80), 0x1670ed58bfac610408e124db6a1cb6c8c8df74fa978188ca3b0b205aabd95dc9) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0be8a2b6819e5ed4fd15bb5cb484086e452297e53e83878519ea8dd5f7abbf2c) //vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x295a1fca477ff3f65be1f71f2f4fc2df95cb23bf05de6b9cd2779348570c9236)
            mstore(mload(add(vk, 0xc0)), 0x0b051497e878ea0d54f0004fec15b1c6d3be2d8872a688e39d43b61499942094) //vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x19ae5022420456ca185141db41f6a64ed82b8a2217fd9d50f6dddb0dab725f45)
            mstore(mload(add(vk, 0xe0)), 0x043a124edd1942909fbd2ba016716b174326462cf54f8c20e567eb39b858e83a) //vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0d50bd8e2c83217fdbf3c150d51f3b9e4baa4b1dc3ee57e305d3896a53bc3562)
            mstore(mload(add(vk, 0x100)), 0x137d4c5f8e111374a1b162a273b058ac41c42735a7f26910443e48796206171c) //vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x047e986785533350b315c24a1e029349870e22258c4c1293f7094a6376c1ab12)
            mstore(mload(add(vk, 0x120)), 0x06a31854eac27a0a9b65f9b098d3a47ca10ee3d5ae1c178d9704e94c8b889f4b) //vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x08d9b7926623abaab8b5decac0415b3849c112d3396b5296ee3a7a0a34285469)
            mstore(mload(add(vk, 0x140)), 0x095f1b2a902ebe4a8351574b3ccbf9a2024b0e56b3d0cbe781b9244505d52894) //vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1314e8bb583f3166f76f0d1e1ce9f964c06d88e6bbecfc64ce38aab8df55f1fc)
            mstore(mload(add(vk, 0x160)), 0x0db72f65f3a6cf58085528d93d19b58ea26919ac206b240822616015185d2f3d) //vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2b3c4c58a3cc75c104c9f0f5af5218616b71d7430df19b2a1bd5f4ecc0dac64e)
            mstore(mload(add(vk, 0x180)), 0x09342cc8fc28c2fd14f3a3219c311575d4ab9adeba8385a53f201d8afba4312d) //vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1156442cf1bd1cd4d4583d3b21a054b3171b5452e4fa96a2ddcd769004ecd3d8)
            mstore(add(vk, 0x1a0), 0x00) // vk.contains_recursive_proof
            mstore(add(vk, 0x1c0), 0) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x1e0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x1e0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

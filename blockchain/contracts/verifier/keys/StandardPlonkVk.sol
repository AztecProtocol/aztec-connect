// Verification Key Hash: 0aabda93f03a3b3affdbdeca611c4bc7daec95bcf0c931011aff34d350c2dba0
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library StandardPlonkVk {
    using Bn254Crypto for StandardTypes.G1Point;
    using Bn254Crypto for StandardTypes.G2Point;

    function get_verification_key() internal pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 32) // vk.circuit_size
            mstore(add(vk, 0x20), 3) // vk.num_inputs
            mstore(add(vk, 0x40),0x09c532c6306b93d29678200d47c0b2a99c18d51b838eeb1d3eed4c533bb512d0) // vk.work_root
            mstore(add(vk, 0x60),0x2ee12bff4a2813286a8dc388cd754d9a3ef2490635eba50cb9c2e5e750800001) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2724713603bfbd790aeaf3e7df25d8e7ef8f311334905b4d8c99980cf210979d) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2bb3c0bd01a30b15576e006f77ae49df13fa9a1a3cc5112ce82c7c6526b5f006)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0ef86102ba59d348b60f3fcb3cb3498e5b97e89226d56f0b017e643a518ee1e3)
            mstore(mload(add(vk, 0xc0)), 0x1dd4954a79e68f966d5e4a552ba16ab8e6877026571dac6d0b818f41f1dfe5bc)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x18b6f0b748172bfcdbf01dfbfff7b0f0e56980cf9013614dcdebafd33430196c)
            mstore(mload(add(vk, 0xe0)), 0x299f1792355770477c4a269c881a09ed373b6ce7a01247786b2ce4e590796023)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x27f88a7311abfe84a7a4613db28b70d8ba5c5e8d08e007795070d49dc83478e8)
            mstore(mload(add(vk, 0x100)), 0x0ff7e8a7ddcde2d2cb1607d7a5238323b4fb580b32df2936033bca6d57da21b7)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x07b114574be29a11c1c96a64b45e9aa507e86949519e39f5c5a4292ac7935bab)
            mstore(mload(add(vk, 0x120)), 0x0d081ef5cf5fee87bc1b7a2687f256213baa0c969aa065ddee2510e6dc45c842)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0e94b374fc9d2cb8eea7e49dccaf9a976f58a088ea017a78c5e574b45dad6067)
            mstore(mload(add(vk, 0x140)), 0x25c673740329a5cf1be61b59d8e29320135678cab57b12a0d7ed1a762e82e2e3)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x04629cc7cd8e83f77d22ecc1f05288e5fb6ef05b6343be236cf25ed48fedb40a)
            mstore(mload(add(vk, 0x160)), 0x23813c6360745365915c5734f9c284edc1b7b884ba3a6ce020ef670f34ebe1ea)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x04c460d75cfd85d72c155d30f7d3d5fd132ab8c266fe3869281565d60c77d8b7)
            mstore(mload(add(vk, 0x180)), 0x104bf8b3e6f508ee73ee983ac1c1762b94ff1cf621037cc300dc45aed338b676)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x19fd3826a41ca797d5657480f76df9a9681bd3a74ec26622b702999614ff639b)
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

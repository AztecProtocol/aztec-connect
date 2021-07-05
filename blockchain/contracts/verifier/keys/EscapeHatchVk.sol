// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library EscapeHatchVk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 524288) // vk.circuit_size
            mstore(add(vk, 0x20), 26) // vk.num_inputs
            mstore(add(vk, 0x40),0x2260e724844bca5251829353968e4915305258418357473a5c1d597f613f6cbd) // vk.work_root
            mstore(add(vk, 0x60),0x3064486657634403844b0eac78ca882cfd284341fcb0615a15cfcd17b14d8201) // vk.domain_inverse
            mstore(add(vk, 0x80),0x06e402c0a314fb67a15cf806664ae1b722dbc0efe66e6c81d98f9924ca535321) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1c0588fd609599a52fd910728e01e823e7c857098c10d221f36c9b9978768e63)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x070c73441a6d6d366846efd10cd027420d496f5ad34e7ae23b2230a6023ac192)
            mstore(mload(add(vk, 0xc0)), 0x1f71a05e991ac7129387b4f1e1900d6d430e1eff3a8725bb94508303ccd999f4)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x01d8022bbbd1227981531da7080c20c9658a0c5db2bae149ae20ef186eeec0ce)
            mstore(mload(add(vk, 0xe0)), 0x0e46a0abd9ce43bbee1b8392a1ef59ef0b2391cd2a52a55b215df93d9ea38003)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2f7a3ed172b22e52560a2ec057d71872ecff9a09ae44359d5fd903e15a921756)
            mstore(mload(add(vk, 0x100)), 0x210a934930a64555e50b39d6ad019dd710162008d2581492467f21601a749d9c)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x219bea77980a815076801b2e9620efc9d1b89431346e425f083bd06df6ee08d9)
            mstore(mload(add(vk, 0x120)), 0x30315b387222285fed4551ff328c146ec3f04b49c6a6878a6abe9565e1882c59)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x290f68c59adfb60ac0a1746b3041f030a7a0b7c20b695a7fad0052ad095cd78d)
            mstore(mload(add(vk, 0x140)), 0x14eba58842e2e80b117bf6c99d0d6078469b07973338d7cb3db72fa87454f5f0)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0903a3f0d310bf0d6e7f4eb0fd5f2b020aec02d0f6724f34d362cfaaa0bb1143)
            mstore(mload(add(vk, 0x160)), 0x14eca6144206f9073231bb46cf6244121246f8cb576eff6d3cfa682c93ef440c)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x184e1de02606ddb8369a7094e5da18c3cf6f337f0968233134c703769b23628c)
            mstore(mload(add(vk, 0x180)), 0x1a6782c0d2236ecbaaae902e4177e4a575260345fa302c6ae1154726c5e90372)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0869dad7d5f33101de309d6e548c6bd6af21d3ff415c3aea43897a07d523b7b7)
            mstore(mload(add(vk, 0x1a0)), 0x2313126283314b819616efa4bc7788249853d53f51ba8ee43a5e598e347ffd70)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x22e6a81164a8fd82f6144aec42940dd442ec368bba0964ac2cedbae7bd0e9257)
            mstore(mload(add(vk, 0x1c0)), 0x02ab57267e6628242822d6ceee4251430acfabc253da88a7108da55547af6876)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1d8e758c8996f89f4daa2b729c99de13d045123eef4518783f5000af96f23e6f)
            mstore(mload(add(vk, 0x1e0)), 0x2eb0d07b1f2ee49277455be0e9c2a772d955fea8b68ff4ef57d314584630a1e0)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x06ce2b695fccfc6e6ff4fe3f775127d13160a91249bffc3864dbaec6cad82e31)
            mstore(mload(add(vk, 0x200)), 0x2f7b2996a92b11bd7aff91d83c5846857eee84fc90dd73c0e7e2611a8cb26589)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x00e34e3502e115a0f1770f8055e3c6fa2ca18bd0b3bf89adf271720a9b75d6c7)
            mstore(mload(add(vk, 0x220)), 0x22aed6917d4f0dcb8de0d023e0be25a662859ace888422b97a9b1d6e44816f75)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x15d95b6a7e72d29606242881f6cd4ba2abd86df26a1bcecd0217c67730edbd05)
            mstore(mload(add(vk, 0x240)), 0x266461004684c243461c554ff45ba43b1991fea969591fa41b41b7f5cbad5c31)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x22f300ec05d8d4d4232d49a1ea990627a25022d11e72d5d06df5e6e4f43f5fb7)
            mstore(mload(add(vk, 0x260)), 0x034f3dc0ce59756c7d8bc3b3d6aa4af0719322686da5387a8f1e1834f227e1df)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x00bf0d712bbad958feb63edaa5287c91f736e60617b21bb8bd36054b5ee9d0f8)
            mstore(add(vk, 0x280), 0x00) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 0) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

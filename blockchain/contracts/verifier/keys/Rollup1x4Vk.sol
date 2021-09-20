// Verification Key Hash: c69e6cb75c159b50f67ae1430e1736f9ab5670f279764e515581d28f99556af3
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
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1c98c6a7879096f23c68735ece5634c425ecddaf3a11293970fa1504cfbf8a85)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x102d9542bb90385c92553b8a6544a9076dab18785eff3c3601aa521dd2e50907)
            mstore(mload(add(vk, 0xc0)), 0x00f283f7dd54628541cde0d0ebfca2712cdcf11db7ead492d9cd580d26299622)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x26dd26c3d17d86bbec4f50906e4e427ca322ed2e470ba729ed73f22817a22d65)
            mstore(mload(add(vk, 0xe0)), 0x03e32dc0dc85a6b5d4ead89832c94df1364dab33745e2464584b0bf8af68b08c)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2ef654080e58c2784d154fdb5c44255c64896992ec6e77a42d2e7cba96685aa9)
            mstore(mload(add(vk, 0x100)), 0x0f7ce013f4c136b42be7c93ee45257da3d245ceb8fe971be68addaa394cb52f8)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2936885d4839dce4df26f4d365c82aaf1927749092dd5abf6acf18451ee4da85)
            mstore(mload(add(vk, 0x120)), 0x17e757660f75f844129a6b21e93b17e2636a72a757a3b5709f5d50d17f9964bf)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x10900ef57ba5636a2fdcb1dedca45c0a3d8807aceed720d29465afb6441296bb)
            mstore(mload(add(vk, 0x140)), 0x0624d4dcecbe53e809f3a18dd47fc9bdd73e29918367a4a898cd26c17a0c3f92)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2d1c568d1bdd7ee1c81485412e73d5c1d117aa347f60b04a40a2e128177be061)
            mstore(mload(add(vk, 0x160)), 0x12ac80a4a5e823f0b9585d9367f784c64e50a4b192002751e1ec1bca6890bdb8)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x04cb9f0633c5decd8231728c59a0eabafcf90565ceb7935912464350a8a84af0)
            mstore(mload(add(vk, 0x180)), 0x266529450c57a00efb0513e3c5579bbcfc3fbcf1532477cfe7c6894804a35fff)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x163621c80e892e7c11aa570f03fbcd4deaeb40d3424d1fc234e37ac0423f594a)
            mstore(mload(add(vk, 0x1a0)), 0x247a75a011465eefc88fbd2098725883d1c3d36683257e0991cbd4c139188a3e)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2835e349311b2622b7eaee6d11887436541a5f8e640e7159db28e25b52acf8ef)
            mstore(mload(add(vk, 0x1c0)), 0x170a3d12e97b5be9d84c2243595e8ea486810c9185b6cba358c3130db140172e)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1b5bc195d4ffadaceaef982afabc49234d39d2e4f6d5f46488ccba2af0d0f07e)
            mstore(mload(add(vk, 0x1e0)), 0x068d6e96c99aa272295ea228d4e0bfce7123b07a26b4a3e429f6d6d49093f0b8)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2c7ab25a5fb3bc18cfd23effd790770cde472b6cdcd0cdfc822fdaa658fde184)
            mstore(mload(add(vk, 0x200)), 0x3010efe148a56999cbaef588ae31b2fc2f396628903fd9f409d9df193c1540e8)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1a2fdcb35aa7f086250b00bef9bf0bc4966590ca3f8de8b705235501a37e4fc0)
            mstore(mload(add(vk, 0x220)), 0x2d3eb544520c8dc69b9c79396bb84462b955351b61c539b2ff7ae8fbeac1a8a3)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1e89b43b384f216d3af5ef14292cbcb05786eef586cde484a5d70430635cce5c)
            mstore(mload(add(vk, 0x240)), 0x2b096b7840b15a491ea7c3957f3e917a87af5c9421213022ac0335ff7e42aea7)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x09023b887647a847a45777ed7065d37c84f380fa0c5c07697edbef13437eb377)
            mstore(mload(add(vk, 0x260)), 0x2aa3d32b989a947a8fef72da9f834a08c4a01ecc7580bd76b13317a7f4db78d5)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0ca1df975e288cf56a298fa2ce68a4697eb909acc75e086b0453857afc2a702f)
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

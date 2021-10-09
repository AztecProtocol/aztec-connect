// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 414) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x28a948d55670e2e8dbf0d9ec5e01735047eef6bf79d33d7657e5350d0d950caf)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x04b5287b9d69e5e38afe8f9e7f93f36afe2baee9e5e37f14aa55030e4ad8d29b)
            mstore(mload(add(vk, 0xc0)), 0x09803e5888714169a26969f2e1d4c27c4e64b62b2be1e3c595d9147d2108b4c4)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1a1c90ab53b302c5fff99cccb5744a30fb01bb4f4d5afcd31110cc2d27d682a0)
            mstore(mload(add(vk, 0xe0)), 0x1d8db86cc7dcb4a0fff75492a6abac39cc1e25e90e574cdb7104fc102002388f)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2c90ed151713192a69f1ade4ed86d935c008a71484f2191113ab682524bcde04)
            mstore(mload(add(vk, 0x100)), 0x1da84927d6a8f85333bea1829394292ad31597be66201b4e8a4b050345d72941)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0fbbf1c6e9e583590d166b67bf9ecd416eea99ae089b566408516cd980f7690c)
            mstore(mload(add(vk, 0x120)), 0x2f682074132f29d63b1df373bf72efa88bad45adddb9964bba1abeb16f5775ac)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0c687a74fc2a640a961d6b16b8d5332204bf3fa450d8f78d06e4e0cc103c733c)
            mstore(mload(add(vk, 0x140)), 0x08bd0a137036f086f4829e0318769730cc9c57832dab2ebb35221f8b1bdbc9c1)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1fc76aa543f328ce8bbe518ce2c0671a471ab027fa67fe5c5e918757153df8ce)
            mstore(mload(add(vk, 0x160)), 0x2488bb1e90b8d1161ba426de1109fcbedceb4f9d8f166826dec67f70a3f2fe06)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1593b59a7f023c9da5d43156e4b621e3eed92691908a46103c5279a6a46ae9d9)
            mstore(mload(add(vk, 0x180)), 0x13e99e9eefdf28e89b2f11da1f8540063b6b180e15d9d326b1db9e022b9494c8)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1f34ce2f6a8a915d3694f7063e912b99bd3109ad3912c9036cf9b2531347e525)
            mstore(mload(add(vk, 0x1a0)), 0x17b9a487e4c0197664dcdf01fdf020c8a0055bf3c26a4e6ee4ad71e54c872304)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1c4039b914c87ede18f3edc94b445a6e81db7904d01daf8d590f91e7ff267d89)
            mstore(mload(add(vk, 0x1c0)), 0x021ab5d06dbce6760a9c325ee0e346613accce2e9e95ae916a71c34a1a5e98e0)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0c197b711bd5b0ff193cda55157dccef95ddd4ba2cbcb82e98028923354c3c8f)
            mstore(mload(add(vk, 0x1e0)), 0x01902b1a4652cb8eeaf73c03be6dd9cc46537a64f691358f31598ea108a13b37)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x13484549915a2a4bf652cc3200039c60e5d4e3097632590ac89ade0957f4e474)
            mstore(mload(add(vk, 0x200)), 0x1db8afe8d528c1675eba6ce2f648ac10628c0ea854dc56ef16d787fe1dcc37a9)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x17eb0de1244c19baa8b516d4d2b177396da1bf31312b74f0d0874d678e4a0976)
            mstore(mload(add(vk, 0x220)), 0x269dee859eb99c6f0299d8fe22a9be64e90ab2f260033add2403d46891d1e8f9)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0208bed4375fc06a3625724d9cb336d922d0e84c561d50790b62ad297d8fe213)
            mstore(mload(add(vk, 0x240)), 0x1b4e73786ec3c45b8f7dd79b62915976155004ef54ceacca280741f412870577)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x227f6bf84748071d84c74ed69ed5cda3e37ab7f6f246763ae2ce416288a2f2cc)
            mstore(mload(add(vk, 0x260)), 0x270985fbf07b4d6c5b22a37eea8b83ac9c714a7952c9ff65805fb1f184548f1c)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x05c1e509d0b40fc33c7ba287773d2ac669db8525ddeeb2048da018026ebdad74)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 398) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

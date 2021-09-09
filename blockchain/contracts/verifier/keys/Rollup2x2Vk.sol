// Verification Key Hash: e0e0c3c29c31d4cd3a5d513e9e3d6e6723a7f036e5c5c7c075ff3c3d920ff5cd
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup2x2Vk {
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
            mstore(mload(add(vk, 0xa0)), 0x0b6d588e9e4c8b02f88c3ca2c44776a0e092214a585cb415c72fc1b198baa5fb)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0b300f39dc25b1123d020e49684082163f66f4ee0c4fe6fb84d29f7db2b45982)
            mstore(mload(add(vk, 0xc0)), 0x0241db268e695cecc865d94c46fe37a128898f870632a23b797a00d3212a393f)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2c23d455c8022e2d1bcd0c77ff51168d4a03b359e870a5be2a72545f2ea47136)
            mstore(mload(add(vk, 0xe0)), 0x2a93f3547782f247c8268dd99104a1ade051da1a01679cd39e7fc1b7ec4726af)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2bb016b4514efe955f72f814cfe1afae7898a246e6aea79954b5a259ce9d9ed1)
            mstore(mload(add(vk, 0x100)), 0x2242bbbb264b9cf652f5946c677d7c10234f100671f3bdce1ce99ada7e23c472)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x27444e0f57f7af816fce82a705e3ced94ab7ba67219e67f910fffff92d43b28b)
            mstore(mload(add(vk, 0x120)), 0x2dc5a20a8b930a9a438980bc0c23933fdfd5dfcf928d9a093f41da8cf2ae5914)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2b427278379012f14decc3b8746cf90d9527936b257860c6868ed339bc8cc51f)
            mstore(mload(add(vk, 0x140)), 0x0ba196da161171e378e8ae4ef85993008af3269d95cba9ce1a1c2e6995a44aed)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x30451a9853170a9ae5817afe85fd1ab73ee180bb15d92b6685b700a34f3fa075)
            mstore(mload(add(vk, 0x160)), 0x04fff689b732616d9903d9fa45b83cdfb0abb4f93f97c73e1e155463f2bf6649)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2788a96abf0fa54dc940a0341ec0c26b3a195cf5cbf6e50a83eecf364cc30e0a)
            mstore(mload(add(vk, 0x180)), 0x049c0ff12a85096a7dc4a71b76a306a449930ef10a9434abde3e29b63601e679)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1a2dc7b2612dcba309779ea09be9235c1a9f46fed6d99654440c66fbf936639c)
            mstore(mload(add(vk, 0x1a0)), 0x1d9f00e788ea138bcc48d142810d41da7b13a44e0dd026af2f33d5a36efbfdbd)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x275c9879f23e30ecf155ba349ef169979e2932ec4e1ebdf6d52f20759dfdbf1e)
            mstore(mload(add(vk, 0x1c0)), 0x0e88961d34338692507f6876d249525cb4fd43604b7e0eb81134bdfab9a13f76)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1393826f947222907b5578fb491dfaaacf1f8b581738e5349284f59969c380eb)
            mstore(mload(add(vk, 0x1e0)), 0x1233411ae4c47122dacae939228255ebca82a0b685617b83c3b402caa0b1243b)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0052024a4ec97672b0d62a68ae05adb130bbb4cc59a4b4bd147435ce1e5974d7)
            mstore(mload(add(vk, 0x200)), 0x28cc65a9129e2a416f6870d15c65dda9ae809d7d62d548d4311afb06535cbb44)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0fc9b40d9e2e577c11cb31983579c7f0c08c9cd2aa4cf0e85c16a7bf47d8d1d9)
            mstore(mload(add(vk, 0x220)), 0x121a14a74e69e0b2d65b262a9338b0329036b04c393470da27391ca1dd2bb078)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2658e7c741be9782da6f40ed199bb0c6e81ba310650bf5eda7d24b45c673c2a0)
            mstore(mload(add(vk, 0x240)), 0x2b4770c1c5b05c0f7fa89363cd4a9d04dceb839dcd1b0ac9069218692f93a760)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x02d27f16ba2e752be21d514ee07826fc74d109db4f3ff97b715e87ab59b7a14f)
            mstore(mload(add(vk, 0x260)), 0x04bfafe2e9a906a579b0641a54fc785d209fb221f0bd8b860fb68940fabc9e29)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x161d7b3b598122e41f52a5e2326cf2d4cffa6a46c7695dc8660abdd389d2c9b3)
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

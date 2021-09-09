// Verification Key Hash: 17a3ae0d47ee75735be7ef95140f64858c7b52d88df6f0b96b02f900c833b8dd
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x2Vk {
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
            mstore(mload(add(vk, 0xa0)), 0x208089bd2e4adf8e35510f72df6a590ca19184e52ea309a2278e7f24f6f4224a)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0abc2cd6deea1e4d05526db4454f1547dd63a7d610df7daa10fb01cd08e1622d)
            mstore(mload(add(vk, 0xc0)), 0x1c05a6e4932c26bedac8c5504d8c09d0a7e8437249ffe30035b5054bea651263)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x13cb28300afd8381048079f0a4201acf57538dd10d881caf328eeef02ee15bac)
            mstore(mload(add(vk, 0xe0)), 0x249bc6cf16e88ea4de63143f340f9d040f9d83b7fe463a2a9cb9f1e50a01cbd6)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2d27eb947596d667cff810da0f442cd82ca68226d369f0f043921b843fe2d3c0)
            mstore(mload(add(vk, 0x100)), 0x29ad33d7747ecdaad718812780ae5ab0433429503674f7c92483bd4af8fa536a)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x079fabc981f688ee7b057b685963ce119d500a8484f8cb98439821d126ff8e45)
            mstore(mload(add(vk, 0x120)), 0x0027f68a0c167bc1a0bc7d9cbf70bf4fd79ddff468290d2612b802bdf00b8be8)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2905d1c9b705622e2b951ae966abbb98fd4d1e46f16b00db2c02adc6a4a57b95)
            mstore(mload(add(vk, 0x140)), 0x250d255824b1b51a81d532150a2dc21feda0f0178576b5b44e7b6b3d4e7eb97f)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x27bddf0965dc89e40d56370d632e1ac82b5651d1be801de37f308a5fde5ac5ac)
            mstore(mload(add(vk, 0x160)), 0x10ba568ddaff6860eaca01b16f0685ac722e87a92b998f1abc53e4a0f7ec87d2)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x05042f48128af79c89faba044005c4ce722fa1793316b127216c63f8d24d2a71)
            mstore(mload(add(vk, 0x180)), 0x2a2466bc24ddfddd7e8180f639800c94471c34474aba3983f927a073cf5498f9)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2c58ac3d13881649862f14bd566e3fcc111eb43bfcd73f9a3cb8738d798a1065)
            mstore(mload(add(vk, 0x1a0)), 0x084bc0d766a44bc4189d9bb93767ffb29a2762d4b73bed80f71e7bb3ea84fc4a)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0c6de121bdbb06e6a416a623cadd8d9f1ca6d5be4df2e46f1cfe7a58d829eb11)
            mstore(mload(add(vk, 0x1c0)), 0x2cb4b582f29411477a9ab0f196e909a738a56f3244c798eb801218ae4dd946f5)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0baa4b18f22aee25e4972cdbccef0e93c043d27c572eb78162749892257912c9)
            mstore(mload(add(vk, 0x1e0)), 0x120a03b1acf4bbf28efb9824708edac836011b63b3a1cdb34b29689711d7fa3f)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0b3ffec87fb11765188cfe9ccf857e90f4c94a04835bd7338d235d3063d25624)
            mstore(mload(add(vk, 0x200)), 0x2bc244181af4e60731ae525c1228e31e09be13d01b7afe29bccf8464ae9d54bb)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2ab391dfbb09312b6e481bb92ddf2fe231675d3b7a6a1a5f2caa8ff7f58ca0be)
            mstore(mload(add(vk, 0x220)), 0x1b169b95339593c3a698fea074c440028932bf7a89c9e369635e4d0df111b0d5)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x03579b13e42e3fa0a60bd07e6ac8d883db8008adc2ec4d05042b4855270ed21b)
            mstore(mload(add(vk, 0x240)), 0x27a48a2484d4246c26312f784b580c61b2c739b843816d2878901a1ffcf887c6)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0d29cbbc0a9a10bb82f71358c2f9d4cd2939db3432865613feaf41ea2fac0cf5)
            mstore(mload(add(vk, 0x260)), 0x19658d691b57cf92486c11b474343a397080bcf354e9977a0346313caa5efd73)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0cb1a9eb24e4acab740461d005c4ee7ecfbf07e73dcb346233aee25e0ebede9e)
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

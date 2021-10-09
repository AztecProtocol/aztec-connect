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
            mstore(add(vk, 0x20), 78) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2d7da4a5ba6ca10e43cf7383dd026edb17136225a024171889abc788370fe8ee)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0b7764b610a3e80b0a44df25beb7e4273877facadeafc4ed9d4efd6a4bfa7c5e)
            mstore(mload(add(vk, 0xc0)), 0x14d3c8b01759528025469cb3b4464c413c8b64ff802ff638629e64828afaf90c)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x055e7818bfbfa0e2705d7f44d950ffa2faf1b7345a24d5bea0aafd7dc2faae77)
            mstore(mload(add(vk, 0xe0)), 0x16ad086667ae816423cf12a52d68415601ba583d6f13766f4fc36010422a70f4)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0187c575705895a4a3642d6859d36afb838f85790e5870ca09cbe8027b0ebe67)
            mstore(mload(add(vk, 0x100)), 0x11fa05498a27bc35ebd32baceca58a061b13481223ba25307c65929776b58739)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x18bec637b3b7729cb595012283fa2bbc0d7f61bb7a869a767cadcd42e9dd3e35)
            mstore(mload(add(vk, 0x120)), 0x2788137533de6d10b7d67109cbaaf3c73f2319af8bb402080199dddd5e502da9)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1c3fe4f3ee71fd4027ceff16ff6e33cfe61d3b1b28888b0159a4ea97eb896658)
            mstore(mload(add(vk, 0x140)), 0x264a9cac82e600564a5372feacf7f2cbc08ae6656e2d762eea6a48360c8a9968)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1a36b4e6148ec37b8eed5d623e06d81804fc8834708592e20544b5d9e3c91f51)
            mstore(mload(add(vk, 0x160)), 0x2d3f602476de57a42999a9731d3ceaf2f4b71e65432f28933fd0e4f32b26a572)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0181355eec6206a5cd15e26e997004631339c79e931d9ec35c9880fc1f6cbe80)
            mstore(mload(add(vk, 0x180)), 0x12841b0ae4282c1c01655cb6e8426414a1a39b68c762285b708ec9014740c085)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0a325f616a9aadae6861b79fd3d30cb86c3ec7fcd31fc107eeef28bd97b59226)
            mstore(mload(add(vk, 0x1a0)), 0x1b9edae6ed8cc00c6f8e62f43a03071e8d168dbd97386a1e9ad0e603a6e96cda)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1315c8e889dcf4daf9b14712a0c3ba8de5310674a196d4f7c5c8f14e4d60d2a4)
            mstore(mload(add(vk, 0x1c0)), 0x290883179d3796b4d6bbce70adec1b9b76c2fd5744bf8275b19850f5d2739817)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x3058ee1e47a36d540530b4113c7156ec3e7bd907e805a19928c04b962a953370)
            mstore(mload(add(vk, 0x1e0)), 0x27cda6c91bb4d3077580b03448546ca1ad7535e7ba0298ce8e6d809ee448b42a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x02f356e126f28aa1446d87dd22b9a183c049460d7c658864cdebcf908fdfbf2b)
            mstore(mload(add(vk, 0x200)), 0x223a19671d8fb58c16e1b67a98245c2a2d908c04119af2000c1037f31092226a)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x24b25dadc6c31601b1eef09d28167e75fee716aff32effa16d23efb895a94514)
            mstore(mload(add(vk, 0x220)), 0x06326b039be65b4b9defc480891d1a677819407456cd7e49a5836882741927a4)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x06bac8fa72ea521ba5b32f62d1a091dc1a0decf2086ec2bfeb0edebc8a9e1fd4)
            mstore(mload(add(vk, 0x240)), 0x12020c65b5382ab1da18fbf7b00ef7718b097531477fa4d67294c93a3b8816a3)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2fc89972c0a731730c217b3d2dfdf7a07419d9eda0f398d6d0f1bc64e6a69953)
            mstore(mload(add(vk, 0x260)), 0x23a54e6c90f842e1f37f442611fb4ef129ff1970dce87d73b29277df80985ac4)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x13021a2f374a905beedb95a86976e2e4ca3709e03fc35a331056be7c91ddc1dd)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 62) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

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
            mstore(mload(add(vk, 0xa0)), 0x2434f5ca53c70c4d5f17108dd67714fa33fade52f81d51efd48705e9e55241cd)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x006251f85cf12be169e9a085007637c5bdf9a52400f744f898f8684af4cbc78e)
            mstore(mload(add(vk, 0xc0)), 0x0ab632649004dc62f030fe0f31ace69ae575554fc4d11bee7cf941f16d6943de)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x02268c44dfb0b47c69108bd8b5edfaa53df4980a35f9546152730c41c06c0e44)
            mstore(mload(add(vk, 0xe0)), 0x16ad086667ae816423cf12a52d68415601ba583d6f13766f4fc36010422a70f4)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0187c575705895a4a3642d6859d36afb838f85790e5870ca09cbe8027b0ebe67)
            mstore(mload(add(vk, 0x100)), 0x11fa05498a27bc35ebd32baceca58a061b13481223ba25307c65929776b58739)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x18bec637b3b7729cb595012283fa2bbc0d7f61bb7a869a767cadcd42e9dd3e35)
            mstore(mload(add(vk, 0x120)), 0x2788137533de6d10b7d67109cbaaf3c73f2319af8bb402080199dddd5e502da9)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1c3fe4f3ee71fd4027ceff16ff6e33cfe61d3b1b28888b0159a4ea97eb896658)
            mstore(mload(add(vk, 0x140)), 0x264a9cac82e600564a5372feacf7f2cbc08ae6656e2d762eea6a48360c8a9968)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1a36b4e6148ec37b8eed5d623e06d81804fc8834708592e20544b5d9e3c91f51)
            mstore(mload(add(vk, 0x160)), 0x05f4b572eaa65393f2b63b6c824a79af1043ae79f6706f79d3be245d20bda756)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x20935fc1adc0987f4c76f79abe5d9eb5002882993a58846fdcc61202ffe38c05)
            mstore(mload(add(vk, 0x180)), 0x12841b0ae4282c1c01655cb6e8426414a1a39b68c762285b708ec9014740c085)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0a325f616a9aadae6861b79fd3d30cb86c3ec7fcd31fc107eeef28bd97b59226)
            mstore(mload(add(vk, 0x1a0)), 0x1b9edae6ed8cc00c6f8e62f43a03071e8d168dbd97386a1e9ad0e603a6e96cda)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1315c8e889dcf4daf9b14712a0c3ba8de5310674a196d4f7c5c8f14e4d60d2a4)
            mstore(mload(add(vk, 0x1c0)), 0x290883179d3796b4d6bbce70adec1b9b76c2fd5744bf8275b19850f5d2739817)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x3058ee1e47a36d540530b4113c7156ec3e7bd907e805a19928c04b962a953370)
            mstore(mload(add(vk, 0x1e0)), 0x27cda6c91bb4d3077580b03448546ca1ad7535e7ba0298ce8e6d809ee448b42a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x02f356e126f28aa1446d87dd22b9a183c049460d7c658864cdebcf908fdfbf2b)
            mstore(mload(add(vk, 0x200)), 0x2dbafbc4667551f312ba1e14c0c02f1e21a507ba89cc6b43f50506f3ed130098)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x21b49d4d7da26f536f4003f483bdd9a3857164007936a642ac5cbe35dd10e69b)
            mstore(mload(add(vk, 0x220)), 0x036d08d23ea8281c2f1b401bec96bb3561b825ebc87491ba9dce5b2a03e67b83)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x125ea463b888e42436cbffb49b27c340072edcab06cebd66814b6f71acb59a96)
            mstore(mload(add(vk, 0x240)), 0x0763fe7c9a67f9bb6025eb47717d1523ae606abc807ed6f16fdffe0de5ce3597)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1428160f56926ed37cae2ee3de9a3996b63c991fa885121dd7c6013d2921e6db)
            mstore(mload(add(vk, 0x260)), 0x06ce65857f9f4580eee392740fd1e9bf944312a6d718b555a9688e6259279caa)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1e16e263733a9c3db51bbacd70872580c90a0dedc13cc0d0cada208a3d8c80ce)
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

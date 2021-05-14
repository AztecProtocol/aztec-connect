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
            mstore(mload(add(vk, 0xa0)), 0x2802c78c2ac0dfe30c8a8f883587233e7ea1d65519f81ade99d20cf8adafd056)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1266a7d72d5d4575c8a81be413979ced64c810f1fc0c17c6ceef4e5a29bd7766)
            mstore(mload(add(vk, 0xc0)), 0x174dfc1eabf907e4644c5373ab969971feace276672a4a15b3924d69ff2df5ba)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2038cae45aa5a33ac1e243492c8463a016f5ab6f823d910f17cb89c331a37b06)
            mstore(mload(add(vk, 0xe0)), 0x15ac7165dff3b556ddee3d61c4a5778691a56a10dc1a9601ebfacd84d99a4cbd)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0bf33e24fb82095c9c9453b17a4708101623383dbbe69d5ec3520ac1056dbbb0)
            mstore(mload(add(vk, 0x100)), 0x1958211b1b07e05f3d401cce7c95a7f5fb18161eb2796932469362c059c143fb)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1b9c6d6bcb72386c2768487147ad6c542ab8251f34ed959b7299e83d8af82da8)
            mstore(mload(add(vk, 0x120)), 0x0c7e00b0d102af46ae32ab1af1cbcba0a5c3f9e07167625575bfe2485dee0896)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x24a03a4413a83b8a31b69806607287b2aec147c62f562449c85b2d00687acbb1)
            mstore(mload(add(vk, 0x140)), 0x0388c2da82e27b08b803dbd62c347acfc4141dc1f22854628b2ebddd47425559)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1109051a82d875fa9a309c14265bcf8afbd57c935f7d0ab21388ac14f9a05569)
            mstore(mload(add(vk, 0x160)), 0x25a5b3b85d4712b4c57fabeb6a02391cbd22f4a44ab22ff2ae063d003361fbbc)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x29e8ab72ba147021e4abca31ddd33a4cb7c2d6951f2424cf05a81a2c272bacf3)
            mstore(mload(add(vk, 0x180)), 0x102fb27f86cb9cb91307e021398172b918344575f165316e282b6235ae85eadf)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1d83ac034ef96bc84fcff66cc285c4406a971e75961bc6604b72d2f760ee6443)
            mstore(mload(add(vk, 0x1a0)), 0x1c91246ae88554510e5a12c953e1bba891fbea75f12de7d939262003150d6e89)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1098b5826555f36758820278267bc644ec6f3791bdc3e96960c786b6ec21f4b4)
            mstore(mload(add(vk, 0x1c0)), 0x2a71af2c5ed0a1749919832f036eba54cfebdf64b10fea7b23b01e232856ae6b)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0a4cf2eb3bef3a451cc6f1a5bcfa067a881aded8cbc7b4f93093fdc5a58a5fb3)
            mstore(mload(add(vk, 0x1e0)), 0x0f166177d26cc007cf02cf330aede53e5a0bb08a802fcfbe27500fe8df43ab25)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0782dd0a51f0982c363d57aaa0bd4abf50cc8914c6d40d17e47114701dc6f4c6)
            mstore(mload(add(vk, 0x200)), 0x2f5aec26a6b3175a04cb46d57bcd3992f4cd8c8533bbe8e6832b381313bed69c)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x26791acc4412b71c43b6f2ee4897bd271e0a21f156c3452044a979b0a127a42b)
            mstore(mload(add(vk, 0x220)), 0x0f7cace6ff5488c5b2b5e054de36a21dc004c1bb3ae0ba4b132364c62b9b1002)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1b4fd11c88e0055df8e26aa017486d83034fded009a416ec688c66bc48d06eee)
            mstore(mload(add(vk, 0x240)), 0x282c4e8aaaf75ef53bf6bc4b7a5f6bd73b806bd2789a50e57cce685a60638d09)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1cf9127602142c09b12dab6eba8340311a9780a488e678ffa9297dfa22346e32)
            mstore(mload(add(vk, 0x260)), 0x1ff38e32739ddcf9bb95b09a832018a6420be3b78857083dc5da49ee12486437)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x195108e9480a93c77a905d2e7ef74b3bf5b86514b98a203e35612b6d2ae4d31d)
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

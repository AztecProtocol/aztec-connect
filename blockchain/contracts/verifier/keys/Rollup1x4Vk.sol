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
            mstore(mload(add(vk, 0xa0)), 0x1ce004c12287d89cace88ad5893e0f77f622088c59d007db4262dddc2dae6d3b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2fa4d86dcbf034b2257e745e2c2645b73b8de64b0bd471028018455f1d8b02b3)
            mstore(mload(add(vk, 0xc0)), 0x0004672f04a56c5695caa90bbfed28dd93f7f9dba274996a9c3b28b26c3d5eb7)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0eb8d1c8301381681e9fc0841003cff8498e0162c628f96cac22c3c0dfb9745d)
            mstore(mload(add(vk, 0xe0)), 0x15ac7165dff3b556ddee3d61c4a5778691a56a10dc1a9601ebfacd84d99a4cbd)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0bf33e24fb82095c9c9453b17a4708101623383dbbe69d5ec3520ac1056dbbb0)
            mstore(mload(add(vk, 0x100)), 0x1958211b1b07e05f3d401cce7c95a7f5fb18161eb2796932469362c059c143fb)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1b9c6d6bcb72386c2768487147ad6c542ab8251f34ed959b7299e83d8af82da8)
            mstore(mload(add(vk, 0x120)), 0x0c7e00b0d102af46ae32ab1af1cbcba0a5c3f9e07167625575bfe2485dee0896)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x24a03a4413a83b8a31b69806607287b2aec147c62f562449c85b2d00687acbb1)
            mstore(mload(add(vk, 0x140)), 0x0388c2da82e27b08b803dbd62c347acfc4141dc1f22854628b2ebddd47425559)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1109051a82d875fa9a309c14265bcf8afbd57c935f7d0ab21388ac14f9a05569)
            mstore(mload(add(vk, 0x160)), 0x1de0dcd9c36115c5ced1d861207a7c771a8522eb2bfb5c6834a79aedf51b15c0)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1bd1f909a39ee467555c63b95eb56bb29f57059630f7d353806c67e55ab63ca8)
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

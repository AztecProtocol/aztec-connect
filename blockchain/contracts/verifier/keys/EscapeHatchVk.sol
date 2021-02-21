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
            mstore(mload(add(vk, 0xa0)), 0x1fdac34ccf00062a042f0f3c01dbb548bbe736f37be2ca6b9c110df98fe8389f)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1c4d45b34c19f210fce91ffe39268644616c605c33abe33f6ead6c93384a5abb)
            mstore(mload(add(vk, 0xc0)), 0x13403203d0babd6c5a129a3e35137813c26607e0a82212fda7a6e25eba684664)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2a6e2a6edfbb772399ad7ece5b7cb0b36f4416072f46aaeffb23d915314ad46d)
            mstore(mload(add(vk, 0xe0)), 0x1e3a8e85c618dfef217ecda5d89e6ce416cf0b9081ec3dbcc0834b4d5bc035c7)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x22322bc1756bd0d23b06b8adb2ebeb2296a5778bd851ff4021ee7d906cf2d140)
            mstore(mload(add(vk, 0x100)), 0x1bf918caad0dac44ab08c8209fc2a708b99df624a0b22d8d112e154dd88e2b37)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0b15b0172a431ac40761dd55ab5b8719b9a9ded29159510112c328dc373d0505)
            mstore(mload(add(vk, 0x120)), 0x2e0cc220e854ffe357e11669b7b4e37cc7180edbe9260412d2651dfa3d0dac4c)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2c61f2578d3e68a4508ab55431ad8c956ab0e136066df8ac7165f6261294b17d)
            mstore(mload(add(vk, 0x140)), 0x056f9a3adce5d81a50438b05b7dfb1309d58d5c6a5022d009b6a3543c0536f03)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0dd0b0f5fd5800008cb4121ea93b1da9e9c1786580f520a51194bcda52a75d56)
            mstore(mload(add(vk, 0x160)), 0x21e33e86559a92221cd65f93b816e37670a7ca423f7be8409a8add7dde83fa56)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x121869203a2b40821a716ee39e457a73daa3009d19a8e6f874d47e727d6c467d)
            mstore(mload(add(vk, 0x180)), 0x0d9849bd5276c0306dcc1cdababcd9ce1e9498e7bb61decb0ab034b573588940)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x02862650eace7aaa91ecf36e8328f90214eff3f5151ce059202d6f234017d035)
            mstore(mload(add(vk, 0x1a0)), 0x2654ccfd4faa4834aa5fd2a2fff53097f44106f5e1f6df50003c4b42bf7645c8)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0ab1a3deb267b52a16918d9cb9fed1b07dd5fe2eda49e6aa554bb08a1c16c5b9)
            mstore(mload(add(vk, 0x1c0)), 0x1e2bf351a94e763b57cc6d9728454734fbe9a980b0a3e254acaf391f3c204c98)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0356cfaf39c091567223b0a6a531c3576ada78c6d8604f093362e322c49abf6c)
            mstore(mload(add(vk, 0x1e0)), 0x0055b0b2797d065080a4e7fc00a37d38f873df9786377a3ada94bcb3986348f0)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1ca8d5ea6f8ac53cf90be20e5bb3ff556e8f4d19ab074caa95a60ca08ab836c1)
            mstore(mload(add(vk, 0x200)), 0x00138f6d2eb24555dcbd7070089ac09d58aef94f8d371f2e7d850511b87f7ea4)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x29b58a047eef10a1c5536abdfa7f98bf37f1f012d53d429840216c99a8956eb0)
            mstore(mload(add(vk, 0x220)), 0x2df00eae734a8ab1e00fbb35e4cf7bb7813088b1320667bfa37e9676e88730a4)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x06916797cf9090a7c29a6367f76302c6c0bbc06e4a083b823d438d441e7db887)
            mstore(mload(add(vk, 0x240)), 0x1979141a41c67b0e9e7ace9df2f86a24dcd7b102c65171c9b72a263e5fa1a981)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x10bb55805ee1be8fc91fcbedea83dd2a83770955933becbf546a10fe3413d3f3)
            mstore(mload(add(vk, 0x260)), 0x004bc436b4c46407c4864e81bb08636e228ad4eb4795679ac49d65eebc81386d)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2c4a8cdd123657fdc1ca9a042cfbb142c9cd14b4843e2033d398e0f565538611)
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

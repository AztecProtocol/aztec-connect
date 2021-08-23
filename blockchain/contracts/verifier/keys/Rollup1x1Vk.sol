// Verification Key Hash: bf56b071a415cacde54eda579d8778ae62748cbd391c8a86bfd314a725015480
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 82) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2397199b75deb789f4d81195e173567f76015d13ed708cd1eacf1d0b4c4917f4)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x188f97afed047aab3ef8467aeef646fb144694ac69d3b41cc32795f9e9297e05)
            mstore(mload(add(vk, 0xc0)), 0x15eb2985a73b1dff479c40968c0964f2c706335741ad753bc1a4ea6879365903)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0f4bc56a8b89c4e9d5d7cea2f42100e217f28afda2781eba5080faf848b2fab6)
            mstore(mload(add(vk, 0xe0)), 0x2bed637f46bb7cd65abcaa49f9e9e83b2c7ef78146bc47a5aa694350a2649f07)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0dda19ac0940f3e6cd9df43a4b666cef52c1d2f5f4174b351337f3d09805bf20)
            mstore(mload(add(vk, 0x100)), 0x1e14b3df0033568a502cfdf996c04494570f20990d8cfdb2b6cb211930ce6c4f)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x030fa21abde37000cf67232e779eb6fbe7a581689ab062b75c8647da34e03913)
            mstore(mload(add(vk, 0x120)), 0x1b038b7d16ab8ab3def37207f366633a68ef527b3e5e14f0afddc60ee6191eb4)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x03309b388db21f39701d87fd31d4e5028b30cca689654aed057f642bfe6cb5c5)
            mstore(mload(add(vk, 0x140)), 0x028788f689e3d32b0bea7c3c3698e770e83f5af525b82f7364b62cf34233df81)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0e52696ab4f574b3d3818843b3bf4a93199ac7ca703899351773e6689f71b802)
            mstore(mload(add(vk, 0x160)), 0x238d95551a569053815539f7af5644718855102eef08c84a66b31e3f67ca0be0)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1cac63db2e8f44e41cfe1ab21e27663622fb7732d31531292ee873ceaf401332)
            mstore(mload(add(vk, 0x180)), 0x29f710beafcd5ff5911c0826e8c46a77378c770a27cc1bd5d1edf237c471b732)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x26bf374d9da1b5e27e187b4758fbd04b984f8f969ac89e94d93668dd4bf0366d)
            mstore(mload(add(vk, 0x1a0)), 0x0876e83af40f4b80f8db9e58a9d130b00efb8536232ae5a57cdbede946734e1a)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x120e4e36f23ca2d81c1291f32eb15efaf8027bc5f910374e0d6d2167dc74e8a5)
            mstore(mload(add(vk, 0x1c0)), 0x0f7383b7e0c8de7cc480ba7598d58c4889a8f57e59120928ee8f9636e4f31569)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x06646a8f27b33d902547de60aa2fa416acfdb5f4e9898de1f7dba5773f4ee9d6)
            mstore(mload(add(vk, 0x1e0)), 0x0937a8259d0455fa9454a04f5aaacaf9d2b6a0bbc0ef1d88313c70716c686724)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x08fc8bae3527f8a99c5e3ab927d39ec2ff11270814d8aebadd539300729c9957)
            mstore(mload(add(vk, 0x200)), 0x2607a89eaa6b94b1018536332918cb610ac76cd75924533227abba10539b1183)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2168bb28bd50c2fb7b34acf6e17c9b5b06962a7b21d0d3c226317e6ec966b893)
            mstore(mload(add(vk, 0x220)), 0x054eb8c49ad5b2e6814929d4cfa5e271bd21a572f44cb8121f4eb984d54462ff)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x097bce6e0d98c1fa871cd1a34e039a8fe93b42d6dead46dbfe5bb3cc2a438e17)
            mstore(mload(add(vk, 0x240)), 0x12c593e691a59c880273e8afcc052eabaef0e22578ccad712a546cd80d322390)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x26407fb8adcf6520b3b540941f959b60d130f4abfc5295bc79bdbbd4a56ffade)
            mstore(mload(add(vk, 0x260)), 0x28dd6069c6c9c80019ee31493b82e8d90b5d92a5f23c8e967756f1a1848f8cab)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0021d85b9a4dc21e90982109b7c2ac5204703c39ace7c51074f79dda322c8eb9)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 61) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

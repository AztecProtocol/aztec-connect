// Verification Key Hash: b8ba570bf42690522192d8dacd6f2d37d08930a83a8d3beb6283a123e7b5add7
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
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x12998493621416d81077dacbcf785dc27c9febaaae3b4d98148f9fb930b1f04d)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x19e55d73e1c6fbce9ebf327d05943834b004d69416e5e98ad8f14af3c842c7d5)
            mstore(mload(add(vk, 0xc0)), 0x250e1bf1bc6742f673547513ccfdb13d724a8b98a779e1d4b1eff44344dc2029)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1d0e9b9547adff4c25c5ebb90b99c2a2c69a123dc893df488bf243bf710c8d9c)
            mstore(mload(add(vk, 0xe0)), 0x14936216a792a47aede2b41cf2376ea8d81586df7d98d4dc3e4ce970af38b54e)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x05def26eea1c50f9f2362c0b44de17792777add216e993adfbad14de1d68fc4e)
            mstore(mload(add(vk, 0x100)), 0x22e00f023eb122c8a4d39f3f976610dae2c6df52273aba2e63cf189a85114129)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x17e95c959dd0658b6e5a40232bcd690dee764c84e151bda2996379244ba1f38f)
            mstore(mload(add(vk, 0x120)), 0x1355739a9bad4b06ce84cf2c276784066e9a100c367934ecfd9deb779ef92631)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x23b8555045be7b0d6600042f58bcd6d1b4910966cab1f31db119bc397227bca7)
            mstore(mload(add(vk, 0x140)), 0x29ee7904ee9761585256a71760d6c615bb05a5f99166cc605d728605895684b2)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x23f59bae10418c44cf7138f313f56ed129e8fdb458e1c5bf14a7d60968658cbd)
            mstore(mload(add(vk, 0x160)), 0x2ec52053d40fc4eefb5456781d90db6e459d734f720b874861a562437057ab39)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2abb01e3212269ef03849db1458b439fcb2fba710f297fbbb81d61dbdd00ff07)
            mstore(mload(add(vk, 0x180)), 0x2d067756eb9661d230758186a6acdd1d927c39f14defa8ca56ede3f656003f4a)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2a94ef58165345f2f99bb00e41a3461130e4cdb113e5bbbab5d9f37a50914a17)
            mstore(mload(add(vk, 0x1a0)), 0x1cfad2f4c1dae35d729a487a41e94bd5e92c172f54068b1aab3bb5e1eee9fcbb)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1c579e0b7bb053f61803be918e7ad90ac115d93d6419c3981352e6e97bccc4fe)
            mstore(mload(add(vk, 0x1c0)), 0x13f7a645a26dea186c3f609730bb81e78e2206ffd47b02191609f2f19688e699)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1fdb26a51e79c54b14347826086969482eac4d16a0dc6ba99a548ecdacc60dd8)
            mstore(mload(add(vk, 0x1e0)), 0x12a7ce2e648e6a911cfa6d02ceee0bad657734ca1a1d05a62b27239884652412)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1471e11b8f07b08ac5dafd4d82d2337a9dc0ce3bdb2342ebbedb5b7a06a8c351)
            mstore(mload(add(vk, 0x200)), 0x113799ea99453f5da916e3441d6b23a9e1629796201d049782cbc81603d6a4b0)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x28403fa0feef9f6af27dc3c3f6ceec031ae0627d6bce571e9e33456c76ac530f)
            mstore(mload(add(vk, 0x220)), 0x1d8beaae24a61b0a2bd49b34d539d5084994c77b3322f59f06b129113e85adac)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2e0c9abd9d8ce5f088ee649506b6e960ccdad732edae2cb0b74cb79442b9560a)
            mstore(mload(add(vk, 0x240)), 0x29ca0edc3a2981922f6e87f8311aa30035ac6d12cdbd9b8f30292edb79eb7103)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x24d56d82614774f21d35489b9042f4022cfce23085c1e90e380e1d6bdc934b0c)
            mstore(mload(add(vk, 0x260)), 0x0702f15d545674aa0787a65d6bc9c564ff6ea46701ef80ed7ea2ffe4acf6259f)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1057ca281513ec01168d9802c8b40c25e48a868bc252b10103c42cd5d4a2af5d)
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

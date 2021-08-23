// Verification Key Hash: c40026fdb8a663208c20e3182b4d2a2d0be61be4fa3e9e817739b21dfd29879c
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
            mstore(add(vk, 0x20), 392) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0ea706f1c3d2e55188368ea0d1eed5517af7a1873bb6d14767e6e001ad4b68a9)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x08576db8aeb97ad5e9c179f298b7dad78ce0c65acd3af4e86804fcc3dcc6134f)
            mstore(mload(add(vk, 0xc0)), 0x0b3157c1be0ece5ca231674587a9f23f9213fd0b8bf4305dc1481768c99a4dd6)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0fbb64704844d1f252a3890e2f29fb5a143c40caa20eb34dc997bec9f86cf651)
            mstore(mload(add(vk, 0xe0)), 0x118110695864f30c9fd3d7612b84ecefe45305ca78c8a92f9a01a4b8cf212070)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2e44a03828e655ec972930564fc25ef1a044568bca124beac395100c99b689b6)
            mstore(mload(add(vk, 0x100)), 0x1ef3caa871e3dcc4384ad914992a9863b681aee23c58067aaf8ce2e01c1f63ba)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x25133712cbda3c246224d5ace3f1cef1293a9c5f8ab8c252527591338d8846d8)
            mstore(mload(add(vk, 0x120)), 0x0ba1e971e2d961be583a80ff97e084aa8ca37d21fcbca2abe53884d8f64d9c50)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2418cab045242dbb4b79f33ddf963cc53cb1803e94e22bdfa70ff28d33093a05)
            mstore(mload(add(vk, 0x140)), 0x0b8dc29ae04f4d462cf90643c85868d9d68b5d6e839d5d14a802a26bf04bb501)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2d4eb17fd50875166cc5589345af1605a727e1d22053a6434a1d6ec54bb47b14)
            mstore(mload(add(vk, 0x160)), 0x1e5a749d6efe552c275c9254f3c4dc7f8fcfce1d9d513daaaba1114067e08c72)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0abcfcae07f10f0395d0ffdd600307ae22432d5d99a1af36c9cb00d339039ea5)
            mstore(mload(add(vk, 0x180)), 0x19b4c4c7483afa1cbf42682b2f1b4e021466c2e56940d76f94805c6f6d16421e)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1c7180b4fbbaa3949d25d64fac5884f74eae709dc4900cc302c155ae847201a9)
            mstore(mload(add(vk, 0x1a0)), 0x22aef7da5eba0d7d384efa16c6085d24852ecc5f2196674c877385559aa73650)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2e1132eef25361a606d72b5b5af50eb0e4cca75210865725d2f7e18b3ceb7eb7)
            mstore(mload(add(vk, 0x1c0)), 0x01f41add5cf7bc83a32daad5994f9c95a1929db571ffe24bedcf994d6fe6c9b4)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1c192c77e4e3b8d269f2cfa02d68e4cfaa078363f1e8e12fcc5feae304c43ead)
            mstore(mload(add(vk, 0x1e0)), 0x266c921187ff46738531a1363f462be42137ab9db1568b95903ef04474082cef)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1f52b247b7e77eef17f37959bc2bee17966005302c4f91f68b84f8be1613afe3)
            mstore(mload(add(vk, 0x200)), 0x2578d6badeaed962e7f72ce6f778c2329dd6e3057117a2a1266d27f2c1df80af)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2f539c8f859d3bed46ad77d813adc6cd7e6cecf4a4a3fb40397171f96ddcff91)
            mstore(mload(add(vk, 0x220)), 0x27206396bca6519623b6d88ae92e4d66b2c8981e6bee9515d3686042a9d2c690)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0a93c47731bf581f2326d14ec2090cff9584d502bcea420fb2ed6cca4e5f5a17)
            mstore(mload(add(vk, 0x240)), 0x1af2a9ad36748894ecd065eede53d24f27f6762a2cc658ece47eed0eb4f7c72d)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0a429fd20d571d2798d409c245e4fcffe42cbe5cb6b3c9cb360967f682d72610)
            mstore(mload(add(vk, 0x260)), 0x02090a927e9e28c3724e0d1da89909adad1d99248358297d8b7abe740d6a3526)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2d9c0cd6fe23abf69caba02abbce19c6453144f10e5464942e50ec44de044dc4)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 371) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

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
            mstore(add(vk, 0x20), 96) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2b91f7e335c1a05999866f41289cbec22f1936d9c1acd3c832ebfaf34486ca8b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x171440fb1dcae6e67dd65a6692c4bb68215cb28df517b003a333be2c84944954)
            mstore(mload(add(vk, 0xc0)), 0x14a6b47f6cb0b3ebb0861464ef154acd45d700cdcbec486dc2321904d95a4dc2)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1204e914d822468241cfc07ae2eb6463dfaee34eeb61e9e960f74397e19ab2f8)
            mstore(mload(add(vk, 0xe0)), 0x1d681d3ba5467ca8f27866e3082ce8c17b162b719aeadfa5c94b3af3ea779534)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x04cdbb00ee34f5f1e39e498ecc0b0312ba5e3c321e275a1a4e7bf75628a0bceb)
            mstore(mload(add(vk, 0x100)), 0x03d02c50fa617c294e480c01b3bb18c8fdf391eca5734713ad6ef0990918950c)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0beef0cfc89f2f303c7337fa09c53d5104523b6546376d85f68f144ae23a49b3)
            mstore(mload(add(vk, 0x120)), 0x12881e8fb664a111a1edea33eb456bde9a1a97ffc5c1c7d44752ae53d99b8c06)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1ac7ca1826916006d8b8a886b5d0cd1674f0497ec9b003c03a034ec9f78eff08)
            mstore(mload(add(vk, 0x140)), 0x2e6a6a9af0dbaf294c37a9a1197825aea89fe48d85633e375c007cd83bf9ab83)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1edf64d757c7d7fd6064c5263b8f7297e52340e931deaf588e52514ea26d381b)
            mstore(mload(add(vk, 0x160)), 0x1e210d59cf9eb1b61c07edc1ddabd0ec4b4dcd4669389488f0d6d76f7b313922)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2cd59089c698adbbdf023f2b3aff05a0576714bb7c411fbeb1b96e3b810ab1d7)
            mstore(mload(add(vk, 0x180)), 0x2faee53cf286d7f5e6306db746936a428d43d57cc9027fd8d26d6ea77ca92f89)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0834590e84500cf75f2601a27406e3423bf5c27f0d6d3552373861eed39aab70)
            mstore(mload(add(vk, 0x1a0)), 0x09dcd889754723b5c8ff796fc8f7d6ca9a61f56f8c2e72b9ae4df562659e9a21)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x14f6ebfd9851445fbe84f52269c29f50a4ac0e6150bd6c9a2da82bcfba09238c)
            mstore(mload(add(vk, 0x1c0)), 0x259a286bd0f989f8bffbdd8b707af3359569494884ca78485655e363ddb5f617)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x07cc7d3bf5e8e2f61ecb7e857836054ebc9f0d7e492517f4543847f8d6ba0898)
            mstore(mload(add(vk, 0x1e0)), 0x0ae7a355ca24b2812dead9f8e58a47364983311ce22ecf51dc1637ee0b4336aa)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x119ff77a9e49033e725febf0c25e7ebbfc44e89863eb6df2d6b0a2f42276c8ae)
            mstore(mload(add(vk, 0x200)), 0x07bb749a5f85925511eb5d93b8e9c035a14b9a039796eb2a2c2a34c9ae18e8a0)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1ed0c1ed8515ed6deb86ec946944b886edf148acd084bc0bec36e6c3bb9e67fa)
            mstore(mload(add(vk, 0x220)), 0x22d31e7e7957ac2c4c0cf666b7f7c61f6413a6e13ab92994fabef22cc3a0077e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x23218c1c0c4c661301ce83b8e949d3c3708f4eba36d69576665deefd35fd4e3e)
            mstore(mload(add(vk, 0x240)), 0x1ee96714055afbb267f642467839f4e269e752db46454de8f356bf26d6dc5ddb)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2a9b32623aa91a3dacc0043bdd5ccc5be7c821c451ed7f87e5c49a126aeb31ae)
            mstore(mload(add(vk, 0x260)), 0x29c19d22805c98b4f2c729a4bf294bda56d1fb46f399fc2fc6f0cebd5d2da73d)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2d86e6cc476219c7879bf59f2284877e555c6e661684d14f21ef4467eaae894d)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 71) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

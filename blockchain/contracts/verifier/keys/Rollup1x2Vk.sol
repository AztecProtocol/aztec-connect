// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 54) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2035797d3cfe55fb2cb1d7495a7bd8557579193cffa8b2869ef1e6334d7c0370)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1cff5ff0b7b2373e36ebb6fe7fd43de16e3da206b845a80312cbde147e33df3c)
            mstore(mload(add(vk, 0xc0)), 0x13fd1d48ec231af1c268d63a7eecac135183fe49a97e1d8cb52a485110c99771)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1519d84f5732134d01f7991ed0a23bdfac4e1abf132c8c81ef3db223cc798547)
            mstore(mload(add(vk, 0xe0)), 0x1f8f37443d6b35f4e37d9227d8c7b705b0ce0137eba7c31f67f0ff305c435f06)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x02aa9e7e15d6066825ed4cb9ee26dc3c792cf947aaecbdb082e2ebf8934f2635)
            mstore(mload(add(vk, 0x100)), 0x0ebdf890f294b514a792518762d47c1ea8682dec1eaed7d8a9da9b529ee1d4b9)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2fbded8ed1cb6e11c285c4db14197b26bc9dd5c48fc0cfb3c3b6d357ae9ed89b)
            mstore(mload(add(vk, 0x120)), 0x12c597dd13b50f505d34fbb6a6ca15c913f87f71f312a838438c2e5818f35847)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0664442fff533df8eae9add8b011c8c24332efb23e00da3bb145ecd2e32102a5)
            mstore(mload(add(vk, 0x140)), 0x284f4d6d4a99337a45e9c222d5e05243ff276d3736456dfacc449bd6ef2511ce)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2adfeaaceb6331071fcf41d290322be8025dd2d5615b9a13078f235530faa1b6)
            mstore(mload(add(vk, 0x160)), 0x06517b067977fe1743c8b429c032f6fd3846ae20997d2dd05813a10701fc5348)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1b209661353dbdf602b85ab124e30051aadee936d68610493889fe633a4191a1)
            mstore(mload(add(vk, 0x180)), 0x04e67fcb0781f800e131d3f98a584b333b7e9ba24f8f1848156412e9d7cad7c4)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1c50e0a2d57ddf592a0b03c6942451d7744e34402f6a330ac149a05f6c8dc431)
            mstore(mload(add(vk, 0x1a0)), 0x149e9c48163b7050a2a0fc14f3c1f9b774f1dd2f2d1248cd8d4fadce6e754129)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2d9406755cf062c4f9afa31c1124ea66a7650821fb8ef7c89865687126c610b1)
            mstore(mload(add(vk, 0x1c0)), 0x26feacb1c66490c9239f6ebe1882a34d48d808c7d778b43039c7bff795c517ae)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x05e6597b85e3438d4345377c2cc4707ae55a58e1b8658b420608d19a44a7c66c)
            mstore(mload(add(vk, 0x1e0)), 0x2956cd5126b44362be7d9d9bc63ac056d6da0f952aa17cfcf9c79929b95477a1)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x19fe15891be1421df2599a8b0bd3f0e0b852abc71fdc7b0ccecfe42a5b7f7198)
            mstore(mload(add(vk, 0x200)), 0x03328c296b883fbe931776cf309004a3b819fab885f790a51d1430167b24698e)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2a76d6ca1d88c2e9ad2e18c03215fafc81ac163ecfe79ddf060d4f4b7389c03d)
            mstore(mload(add(vk, 0x220)), 0x11e7c17289e04208ec90a76ecbe436120193debae02fba654ae61d0b83d1abe1)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x17f03d09230f58660f79a93fd27339763996794c6346527ed1ddb06ffb830240)
            mstore(mload(add(vk, 0x240)), 0x0f58505fafa98e131cc94bcc57fa21d89b2797113bd263889665fc74f86b540b)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x153e8f0949a7c7f83ba8e6a6418b254c5703e836f864657ca8adf17facbe3edf)
            mstore(mload(add(vk, 0x260)), 0x1dd744cc20dcde91df6e12965f9b4572b37e898ab61cce8580a8635f76922d66)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1480e010037944e5c157ab07ce92e07bd367c74f5710a8229fcfecfd1cf860f2)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 38) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

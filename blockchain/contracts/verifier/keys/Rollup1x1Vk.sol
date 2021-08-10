// Verification Key Hash: d6726580922eed1c8cdb8ab4de7f51252ef9d9f423f0a9a7c1e4302df4ced15c
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
            mstore(mload(add(vk, 0xa0)), 0x1aaced5fa10ad83799dacb820e28310877da3788ef9182bf5ef7100c68accc1a)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x07e5d17484f85db27dd3210e58ca5c6ad9a6d375143db4885d998de0f0290a8e)
            mstore(mload(add(vk, 0xc0)), 0x0999ce4f6be45f4164f6c2a59601b308e78af1045e00dfebaabd1969f980c19d)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x27e96b3f335ad4dcd7eddd83ad1789f84053f667e309001ddc91f531543ce79b)
            mstore(mload(add(vk, 0xe0)), 0x1a7f708e124957e48864f91205cce9c01fa6af1be5663dd9cb6a83c4b712c14b)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0ce4b7fbc9c1a2e75cd59b465e61bd980a0f6079836830658a709369d63e8b6c)
            mstore(mload(add(vk, 0x100)), 0x2a98d450870d2036601a0ab417225506ba030a7f03f73d328c4e3e6318bb738e)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x00b236078a9ecf180e7b02c5b75f5367c4c4cb0cdb64112d269eb4a85a270e96)
            mstore(mload(add(vk, 0x120)), 0x267cdd43d9707f1ed9403fc9522254b4b0d301583895e1a41f4311d193afeb23)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x22b16412fb9a5171e2b8f0fcfe56e3f3a4c2f3787ad71659e57a0291190fd7ee)
            mstore(mload(add(vk, 0x140)), 0x300464159533a3a2ac7f4fdbdc253efeb685187116d68fab538ae31818161d09)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x187d73eb994558e527130eb35e666d5e12c6698a949e8dc3a74ab162a9ff4620)
            mstore(mload(add(vk, 0x160)), 0x064e7bc59b06dcc813dd726eca1f33f637113155a98b320a09325ed8a90ce42f)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1116e64bd5f50481ddc636caa93ff7a142fc32acaceb3f4ab2c4781a890ccfe4)
            mstore(mload(add(vk, 0x180)), 0x189b5887a5afc6fb8996f883ab110bbf696109575f9363ed8ebc7c2c6e8313c9)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x27c4b1b71a141bb2e240a4726d6f7bb0733dbe0d6d25476a12627c9ea8d71918)
            mstore(mload(add(vk, 0x1a0)), 0x1eceaf0edb924828d4bb268ab8786766b2182e5e187df8efbafb4e68c678fde3)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x17b47b9b19b64b66fb29dcd9b1177242e14ba92fcee6b8e4e76591c6794b0964)
            mstore(mload(add(vk, 0x1c0)), 0x064cc3dede840bf857a9ca80ba27a48380a2ba8b66d62b8df2de9af147ca0046)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x16da04034758c59c3b4c7950c8edb228eebb6e8b54a57e12d48d7a95f8b6dc96)
            mstore(mload(add(vk, 0x1e0)), 0x1a224751de27f852e1d16991a314cdc4a2fe1f89ed3f95b355e6030fcad7141f)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2eca11e9533290001026499ef65dc4e4b19a090f14ee421df74cc966837befe3)
            mstore(mload(add(vk, 0x200)), 0x1d6cbf8c129ee04f664dafbac2da7428f7340625a3afd1055d639e3ca5e1aeee)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x13ccc7f699e2f9e4faba3c3afca4e4452b45c1a2e12b164beeb7832f35f9d09e)
            mstore(mload(add(vk, 0x220)), 0x27e4e4ffe706673577854500b44338aa1772400a47da5d8e4142dedc8c197043)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x24ad6b0b6cc1c63f35aa5ab675b831b5b4d858ac08997adb1c17fd67a5ade53a)
            mstore(mload(add(vk, 0x240)), 0x2a8e38d729a26fa44833e6b05a68619b7f036c1e893abeb541e990e8d0f5e25c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2db7970e21ba7338308449a530241e365c5dad9fe1f41a31f545abc2755d7b11)
            mstore(mload(add(vk, 0x260)), 0x03887254ec48c87f92a6ff21e79beff3058dd6be21cc7cb5c492cd0d4809449b)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0b169a168c78708c218a0c10d91c3078eb308f182157cfb095dcd1464c112e30)
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

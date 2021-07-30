// Verification Key Hash: 183d55c8850216541b78e788d141327690e2994824ab99c234fc0f36b55eddaa
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
            mstore(mload(add(vk, 0xa0)), 0x00efd8e6fe1711b3f7f19e0f589b0fb63b9b187859e3d119ba5283f66f6adc0c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1a5129c306fe90bf94b8b110fcb166c8de01a36bb92c9dda7daa02f178d5c62f)
            mstore(mload(add(vk, 0xc0)), 0x1f4923b2f2854f4695257f0d49794cc703d5d88667f35322782dbc8ea948bc12)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0aadba3102b7aebc6233ed1b69e51619ed8514b218bb09f7d2889946ebcb20c2)
            mstore(mload(add(vk, 0xe0)), 0x1a7f708e124957e48864f91205cce9c01fa6af1be5663dd9cb6a83c4b712c14b)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0ce4b7fbc9c1a2e75cd59b465e61bd980a0f6079836830658a709369d63e8b6c)
            mstore(mload(add(vk, 0x100)), 0x2a98d450870d2036601a0ab417225506ba030a7f03f73d328c4e3e6318bb738e)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x00b236078a9ecf180e7b02c5b75f5367c4c4cb0cdb64112d269eb4a85a270e96)
            mstore(mload(add(vk, 0x120)), 0x267cdd43d9707f1ed9403fc9522254b4b0d301583895e1a41f4311d193afeb23)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x22b16412fb9a5171e2b8f0fcfe56e3f3a4c2f3787ad71659e57a0291190fd7ee)
            mstore(mload(add(vk, 0x140)), 0x300464159533a3a2ac7f4fdbdc253efeb685187116d68fab538ae31818161d09)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x187d73eb994558e527130eb35e666d5e12c6698a949e8dc3a74ab162a9ff4620)
            mstore(mload(add(vk, 0x160)), 0x211206e7d788f4a040be84034e78270e1bde319f40903391a0e0af36c87ca256)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0beaf7e8545333a88c820dde5485865c990028d2b6603f319d02583a04415d42)
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
            mstore(mload(add(vk, 0x220)), 0x14ba34fc79ae504cb1f86c0b4e1e2cdf218db855b278535d375cdb7e04b9086e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0b3b2666a2fcc51ef43e07017007f2c11f4f5ea6ffff98bf289e55143ac6799d)
            mstore(mload(add(vk, 0x240)), 0x2ca0ccdad3d2f23e9940e5af222851eb218ab45a20c4c7ef62c52932cd9ebfd7)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x19a03fdcd6bfc472c2be936f435478bc68e38d39ecbf19741ac6b3c3c1dfe68b)
            mstore(mload(add(vk, 0x260)), 0x05c234ec3b43aff443ee35a7c263d6c415bb82cc1ce8fff780b61b6228e670dc)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x04dea82fe413a0958274d2376caac3fffe7b4dda9727300d999edf46302e877c)
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

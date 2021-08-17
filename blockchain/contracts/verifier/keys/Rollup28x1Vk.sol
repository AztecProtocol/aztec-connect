// Verification Key Hash: 964c47b1caeb14b01d9162dfaa1ad24cc7472f675633cf00ec06285588b61d74
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
            mstore(mload(add(vk, 0xa0)), 0x18e21d7fb848565191f2992916760afd71c9a5c22ae9ab4e11e85d1243019f8b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x05a10f58c669227e0a4dc94f4f94270e1b80c7c99bf89a4ff61b543bad35b6f6)
            mstore(mload(add(vk, 0xc0)), 0x1f20027bfb4d7c78afae573539ed7313130c9ddf182880a21a9ead8849fcd655)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2846a8d09aa09f6fda3b1247d7d74397c2dc25a4f60bc54848ff9292a8efa2b3)
            mstore(mload(add(vk, 0xe0)), 0x18e8cbd82b77e95fa58642f592b20f2724b208e2823f991adfcfad45ca5cd7d5)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1f952f7ead61fc9c61c819ce36a1f6eb696f69972e00a5b954560936eee09ee6)
            mstore(mload(add(vk, 0x100)), 0x23a3389dc4087c2e4ea5456b7a8c0b92dc878b21a5e3a73fb3f250ca30ffbfdf)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x29091e7b868b97635187b4bc7b69922184b76ab23a772fc11ff63da19320990c)
            mstore(mload(add(vk, 0x120)), 0x22a8272bc0a8f6a0b7231d4ae51f6e433b4ad635526505567f90e78b1108a969)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0c768dbf66aa041a59d28cea6025aa830f30909a31830856b6da3964b3c4be9b)
            mstore(mload(add(vk, 0x140)), 0x204fc43625a42289ff8a7ecd18dc16f32877b9af093f92ec86ef54369713710a)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x021a7dd6ad89b798becb32029737b28101ce9bc7be8403f5e0272ed5f4fa5a66)
            mstore(mload(add(vk, 0x160)), 0x0842ccf99fed279b3379524fececde90091a5f7c53b9b2a1de42a7829fda505f)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1310ec6b154bcc02e3b1cc0aaa50bb131f7b1f3ed5394a1e2388d7f97e7ba61d)
            mstore(mload(add(vk, 0x180)), 0x23605c04ae8f56f6fc80d6463209afc3d5820418bcdddc4d84401ce97950f0aa)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1b1d02736135415327579299560160750bd8ead101b6d94d09875c737f1959b0)
            mstore(mload(add(vk, 0x1a0)), 0x11ad0abb2ed88556ed20824ea9e5833e64ab56531f4d90f0d566e5a7a7585d3d)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x141bb7f0b6189ab49423055f941fd39bb83bca670d2cfa082d37403a578a216b)
            mstore(mload(add(vk, 0x1c0)), 0x2a26ab9c221295305ffcc6fbeb7dd4e65b700e01beb00e584d4709b605a6274a)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x07ab7dd916f563b104e16abfd87d149facc848083c2c79895ebff3a83d038923)
            mstore(mload(add(vk, 0x1e0)), 0x16b1f2068b466ef797ac53ccb63348d32c7f7df82ce043ff35af47f1e4475c3a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x044a2ab8853cbc6a891f88ab0216fb5d6245528928e78e9b7ee32dec488b3163)
            mstore(mload(add(vk, 0x200)), 0x07cd08b894cb7f51b6f4ecd64ac3b453182e39810255da510eeb817b8943305c)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1d69ce9cb046daca781086d0027d338e538004bb8c147886ab8242aeb27802a5)
            mstore(mload(add(vk, 0x220)), 0x032cedc3554c3b3fe67adf076c023b2052a4a451daf70c60123f8685814a049f)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1b03c5331e9b599960ce1a0ce0cba05395bc5a838edf75eaa798719017d1cb09)
            mstore(mload(add(vk, 0x240)), 0x1e3a0c7b3d4e67d249b2362e2bcbb480247421b15411615f89abb1a9aad9f44b)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x05ad4e390e6edf1ce1dd9c0761be96ccc207987add4e04b010d1e74c061d2b6a)
            mstore(mload(add(vk, 0x260)), 0x1fc00b240a55970345aa07ba1a77da5efbe11759750d92720e266f5a07fd9b35)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x20322a0a37cbf7767565b10a36c898d69cc85b88de067dd0a83d591ddf9f018d)
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

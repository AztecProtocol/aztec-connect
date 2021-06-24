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
            mstore(add(vk, 0x20), 72) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0c3abc6af889dd704a45a3d11cdb7dab3e834f544eb0a406ad150bcdd6b3365c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x285bacf80689d2782150ae86a5e377c6c331f0a5076e4361a96213c9ac440226)
            mstore(mload(add(vk, 0xc0)), 0x2327eddeaf2d64d1fdd882f422118cf901db87f0fc16798beeb654ee5e135e9d)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x253f63723535f54183eed7e47da8ca037c3809c5c53d8005ccec478d8cf955e5)
            mstore(mload(add(vk, 0xe0)), 0x20a12c9ba4e3a312e1426f32422a9596631c7fb17805867bbd698172233eb3c1)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x287f2021ace729600317a886b411548aee61913d1d1943085947cdbb2bf45ce8)
            mstore(mload(add(vk, 0x100)), 0x082daf96cd9fc2ffe293abb1b26d5eef0a49ad67a9f84f194d138955374fb397)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1df1346e029a8d4995e0a9a62e5eca43b5cfc74fdc1661e752caaae0b0a3bdfa)
            mstore(mload(add(vk, 0x120)), 0x0f03cb5a62de662cb9f1130018e5311aad163f9b80dd118fab8d9a6439108df0)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x015744b4859f0d99f90fd610a2710b505c84d1b2ea3caf897792c67f6d2561c0)
            mstore(mload(add(vk, 0x140)), 0x283de9b66f188a131a028210e7312aa1db9b88ddfe3b0281f5c25ba421dc38b0)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x271e7761bcc118c600d3e8a471da32ae41a22f3dbd4d19e6383c9f78b1314b79)
            mstore(mload(add(vk, 0x160)), 0x2cb07c5046844640bb73b432e00e147608674275cda406517dc357aeaba6f303)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0632b1a8f20765e3ebfc4fdfa5f3b7254d4921041d5e9fbfa671b148f44f046f)
            mstore(mload(add(vk, 0x180)), 0x040b845b2b57b9d86134d28d88682a3e27662c61e5bc7b3e3192c9adf4b86893)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1786c106b9edf491b1b47ac44cff8a62362d9e8417ed92b63e4d9006aa598530)
            mstore(mload(add(vk, 0x1a0)), 0x14f2d2e19b026c6ebe5d3548373e9e280e4e4152a087b09ae9fef1fde2fb5046)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x082a8de218c354d6088c6c613123464e4228a35335e233a6edc237e012411870)
            mstore(mload(add(vk, 0x1c0)), 0x1a252a9d8b758bae13b9fe6b6928e1437117d6bab7bf2a89102b63af35569cbb)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2ec1f19fc860917a526223ba956547f5147ffa4dc2699af78b0b5b51d568dc59)
            mstore(mload(add(vk, 0x1e0)), 0x16f3456cd22aa34f1dc3d18879bf633e11e8c468a8213f8445dc852d1919a474)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1934fbdb0d8cb6a15af9a3a5a8b74c4fd0f5666174b3598fa3505250066ec0b7)
            mstore(mload(add(vk, 0x200)), 0x2ca9e1096fac3a2762ae08ed72241a4057a99fc78c22bae249ab289e187197af)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2d38356513d55c3360b7dd5a630b9878548d61658973971af409b3d8dceec0c7)
            mstore(mload(add(vk, 0x220)), 0x14ab7ca8d3a76a81b1320737563497fdf3551070d7ee70676e8e125558edbf81)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2b2ce2e0045e2dea8641478a3ce2b13316e8cc668237765d64dcff01218b17f0)
            mstore(mload(add(vk, 0x240)), 0x2c8e8e8b0be1fb154cfcb0cf8d725aaa1a8e0e25bde209dcd2301aa5d56c7efc)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x25266f052d12f809d90c0909220aaafdb4fc6c0574ce25a133c720241bd0e9ec)
            mstore(mload(add(vk, 0x260)), 0x07c54950a249701fe8ecf42c6c416ca7e800201b59695c6058b13049988452c4)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0ee745cff5c1211eb258251261460572456053bc85e179a634084e20fc768766)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 47) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

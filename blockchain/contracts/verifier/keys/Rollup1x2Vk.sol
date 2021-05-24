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
            mstore(add(vk, 0x20), 70) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x21edb6f7f988cad52c388931c984b30235f91c73c73cd2865c4ff4bfd47a4cbe)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x26cf3562b85e4c620e3571674d2a8f7298ccbed3e48ef0fbce34ba2c5a2cf553)
            mstore(mload(add(vk, 0xc0)), 0x05564a46660b35f2dc14872311586abf9edf2dbac31892248ac273e8c053b0f8)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x14715a46d963254cf5e24c8de8506a7cbf9973c42d735a95441a9bf2184de4d7)
            mstore(mload(add(vk, 0xe0)), 0x183fedede2950e662d535dc4114b0d548eae976f3e0e82b768715c140e9100b7)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x19ba47b4ee0ccf95bb86e590fac525755250e9273bb0f9e4cdb434eaea7fc892)
            mstore(mload(add(vk, 0x100)), 0x193234f1b6bd15d1665355571f63dd56ad07e76e2c468c5e09e3611c77711ab6)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x23e1fb4a222857eddfefe342814f8f5577d10b2347935f67c4d5afbfbb09f010)
            mstore(mload(add(vk, 0x120)), 0x0877bfc16800c81343c0611ac7c4b105b6932278a857aca0c417f502eff72912)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0c2f91261511e70e07b46e8c30059dad2e9f23b06436ca59a95d4e1bf472d621)
            mstore(mload(add(vk, 0x140)), 0x1e1d1d1629300123bd0c26618925651f6b2187e37b55cdd8929618ae3f306ea3)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x12634ac02f25e3f48baaf88cf43f0fe7ed6b912c376a40e87f2ba0c9f444b041)
            mstore(mload(add(vk, 0x160)), 0x1627912a38b8580376233f21663e50e2262bd1643f1c3a1d9cd9348664b43fa8)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2392b9de0d99801f201ef6925a4ffb104ae3859971987ed8d14ceebab5914234)
            mstore(mload(add(vk, 0x180)), 0x2679b253177c7d9af0c4fe5651d0d8478330c0e6ebd077aae4a445e2ecff7bc8)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0add6cc9d3cc38f535556d3dc12883fc28b1e5271f5eae84fcb940b44537b157)
            mstore(mload(add(vk, 0x1a0)), 0x0abd2e8f64e14a51e556439a4635f5fd125bad9bf515865d0c9c3128e701e42f)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x27f6cfc83cba73b849dd345f5e263541410b74a40a3080706a9efed604c19c86)
            mstore(mload(add(vk, 0x1c0)), 0x2cc798a059995e892c49a77a66c033926a6c230d2c44c319033bceb49344aaff)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2777f22a5a493749dc87a7ad252e5c784718d50eed3d922a6a490a948281d46e)
            mstore(mload(add(vk, 0x1e0)), 0x1b8d24b12158dea027084f1adbe207f99481a40a8bc0a89b5a391309c9220c8c)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x18841f5b1cee816e447d26e6794c1da996fe696ad09cf6a0d38d8c894c5e2dd3)
            mstore(mload(add(vk, 0x200)), 0x190001ac3131d3d354d1e3c1ee19d327a0ca5c7cf200a9ba328b1bb1ec843bb8)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x21b99e6b1ed58b8c66de76f82efe6beb5f8eb4a5adaac1337e4a3ce654a5791e)
            mstore(mload(add(vk, 0x220)), 0x03181cd861980dac9c2c5987e4f5f4380521a2371f0340efe10f81909bef64de)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x102da76846c48e6ba3d46494985a89748394c85ba5492fefe946de1b192684ef)
            mstore(mload(add(vk, 0x240)), 0x26a032414d0da9070029e8938d9042d582f0d3a553b55a3229548d57788b4dcc)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x24902c4ea15c1ad7d4dd6dbdafdb0e89129368429f65de7e1e0a17e916e34369)
            mstore(mload(add(vk, 0x260)), 0x22152e5c2038d0995a4f2b488deac735ba3d8811d7a2461c72cd964dceb2ff75)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0821cde7a7b19441dc836c9b7bbcb63d324e4174fde41ca2dd805d3b1bb07820)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 37) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

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
            mstore(mload(add(vk, 0xa0)), 0x2d46c2fdcc40a0358420eab0bc2df9c37c1f16097112a9469117cd7710ad3c46)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1927b6cd3b1cb097aec56e3c06c4c21f476d2ae09b50b86db17a4e155e961e42)
            mstore(mload(add(vk, 0xc0)), 0x2aa46e968f1e777415efc1333ff3c50c6966d14aaac28a9efa702e38e02ce219)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x086e501db8768425f6688c29ed535f2f2c35aed44076381190cc168d968126c0)
            mstore(mload(add(vk, 0xe0)), 0x21352f1ec8042daa32fc70a2c841d34c2c7b6812bb9fd539fee2b558e1d77a68)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x03a68e035e6f1a43d73d0cbbb97255a2a99e141b0302eed0699f580f471d7db5)
            mstore(mload(add(vk, 0x100)), 0x048d0cd2142ad25bcfb71df724e5cb7591c345a09e7ac6af2d527511927d7135)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0f5057de3497e1aac3235729e57e2a9a3bc64ca62e798dc8fc68ec0925dc924b)
            mstore(mload(add(vk, 0x120)), 0x04199225f98e8414a4c01e1d38d5e2be637f9b20203f062a951b5ebf134dc262)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1b6f245552d30ccd3851e560552f53a4a3916e18d38a3ae6c5780592f61bfd07)
            mstore(mload(add(vk, 0x140)), 0x0ed4c9ccab1bc991ac9cbfb84667dc25481d374d08056830c21cd40ef6176536)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x07cf706ef31bbe398516e2895ae824fbc17317402677c551d2b3d78660f02516)
            mstore(mload(add(vk, 0x160)), 0x228cfee99cf530ed981a7b95b4efc7d28b5a0657595c7ab834d9c02520c7b6ea)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x29a278861ba43a1c936f21a33486fa716a9e337726393074f692eba11c3dba5f)
            mstore(mload(add(vk, 0x180)), 0x25be6ee8c06124c03af5ab6eaa5acbc9905f0d3ab424c7f62fc4a3def41e356e)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x16416b9c760fb4f1b865ad1525abb526dcc9458c5981ce960a1354d95324c3c9)
            mstore(mload(add(vk, 0x1a0)), 0x008ca35d27604ad4109b7e9a654c6b7040ca91937d9e7291751eb77855e13275)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x05361e10bbc19548eab46d4696995bae18745b3e8ff9a7e4b8c0f5034be18a54)
            mstore(mload(add(vk, 0x1c0)), 0x1d423aac9745d1fe07ea738def7e20294bb37e37b1fcbf546bd85284586bbc8c)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2c9880266f2e73a73f3ff93cd641dc6e3957aefbd86960f8afef2e3fed0fc2d7)
            mstore(mload(add(vk, 0x1e0)), 0x1a9e6eec659976c43140fe68461227735b1f12b7e662475fc1679b6f34ae058c)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x19e4b893eb08b04081f470ac13f0a95d9b751d67050cc9115186d4c396db9a8a)
            mstore(mload(add(vk, 0x200)), 0x1b2bd3e520ba45de96cedd8044eb83f1348482512b952655e587c15935b746e2)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x162987fc2c5e597e75d654757abd1f7379b4f2a7d3736ce558b06b131453f03e)
            mstore(mload(add(vk, 0x220)), 0x0df8a5d4991bd16ced23c424f0e4ab36bc0f48a550bff099437fc23d31bf81ac)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1aad074aea5c5781cd7744b62b8918dd7eb85de61dacaddea98c608556780ae4)
            mstore(mload(add(vk, 0x240)), 0x28b56dcf131f7e5fc58c41213134f42edb3012b70bfc0103af5a8a732f4243dc)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1a31bc6e31b957f75dbdf34275404fb419b958a65bc410a0130bf1eb2a57535d)
            mstore(mload(add(vk, 0x260)), 0x13dbcd4292264281d5a0f5c5f75415b174a789ac570aab6eb210b16240724559)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0841347bfffc70ddd60ad689009779392168d873fc0a3ff701d13937c5cad940)
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

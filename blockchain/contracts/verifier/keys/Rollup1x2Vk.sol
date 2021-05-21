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
            mstore(mload(add(vk, 0xa0)), 0x2740ab30411606ef628cf89e6bf80223329fb5adb87fad3021638c37659b91ea)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2300b73d26b9b57f5a5b0e3c3956d74c6a6aed2cf180b6231ef63260b8723d60)
            mstore(mload(add(vk, 0xc0)), 0x133e73761a2fb690a1d1bb28517ed4c38cd0fff2f154269fe8fe37cbe6d04aba)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x17dcdcd6e9f4a8bc4ed2d559c62ae80cabd4900c75f5ce726fab6325b404bce1)
            mstore(mload(add(vk, 0xe0)), 0x109ac3efcd97afb816721e5884802207d0cc42717fca3f218d247b9cba1da545)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0911ce3ff27938faa4f04bf667ecc229d7ea5db38692219823ccecfc3e860ce9)
            mstore(mload(add(vk, 0x100)), 0x0ea566dd60f19902f9a6b5ad19104790be24ef1f8a709ab543b8d25ae5af80e8)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1ced6e7979961e6417b258b1f4eac828d55eb301aef61c9c31f73b47cd172c8c)
            mstore(mload(add(vk, 0x120)), 0x03d439785ab90c52a4e9fe273d32a19490186f5e3061acdb1517963ec5752ee7)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0c12c69b0e63e331008c4eef0973c14b609f9176235264851769f6e3d5529e8b)
            mstore(mload(add(vk, 0x140)), 0x0416891b0987181dec131ebdadfc7317139929622e298e384b2fa9d48c880046)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0d92255bb7a74294195fbe76cfbde0dbaec252e8c01b0b8f10ef40567f67fc67)
            mstore(mload(add(vk, 0x160)), 0x27eb13a59d5737c8b76065d1a2872175528d4a0e0aaf3952b87291b2a0466788)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0fcec72f75fc8dcde427c2553a1df327f7a26d9482821d7761510035b63ca927)
            mstore(mload(add(vk, 0x180)), 0x2679b253177c7d9af0c4fe5651d0d8478330c0e6ebd077aae4a445e2ecff7bc8)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0add6cc9d3cc38f535556d3dc12883fc28b1e5271f5eae84fcb940b44537b157)
            mstore(mload(add(vk, 0x1a0)), 0x29b54c46cf90e75e11d1640dc08b121a45b39b61563cc38bb8804c2cc378cf95)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x04e11f0932f09072f9326fbdae11ff6de8541ca24b991c7a46be35a41a652a8f)
            mstore(mload(add(vk, 0x1c0)), 0x2cc798a059995e892c49a77a66c033926a6c230d2c44c319033bceb49344aaff)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2777f22a5a493749dc87a7ad252e5c784718d50eed3d922a6a490a948281d46e)
            mstore(mload(add(vk, 0x1e0)), 0x1b8d24b12158dea027084f1adbe207f99481a40a8bc0a89b5a391309c9220c8c)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x18841f5b1cee816e447d26e6794c1da996fe696ad09cf6a0d38d8c894c5e2dd3)
            mstore(mload(add(vk, 0x200)), 0x1ded67f6d583e8df32258bbb08dc938a90acb01cbcf262a243768cdcbc678bf2)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x09b0160525d89f05f60e428f84cab5faea378099f24fc3a6f4a9056a5dec9c0f)
            mstore(mload(add(vk, 0x220)), 0x22cbcb08af252efc8a3cecb4f22672a28f3e8300a35e90db227b241b897107df)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x00f1f4f6afe67461bb6c57c783dd7d42d01708419cb33358770abb2fde4fd4b3)
            mstore(mload(add(vk, 0x240)), 0x0f7bc68d805c837a6301682bedc87c336deb9b728d205b0d41850f35a0c77f6d)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x25fac68c217217066ed7a59b6e67cc2d19f4a879fd077f21a059d1d917808a2c)
            mstore(mload(add(vk, 0x260)), 0x0f573e952939ff7a6eeeaab9c51fe686001630f4ac82e4bfd41e8bd8b7f067dc)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2e0c3ca675d4a98a548d33544ba32aae84f952a06010cbb978cda204855c8829)
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

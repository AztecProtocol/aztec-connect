// Verification Key Hash: 64fdaf123afb207120a6dd7f0225b5cc6d8d3947422cfa15c89c28a247613df2
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
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 60) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2d30f0d26bfc12f0fc7cab4649019eb89b44022edfebce6248b2e8d3a6d05eae)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x068ff2b33d1fd97def3a70381c0b2ca83f47d2dfa4abae6f25b1c9dbd114cafe)
            mstore(mload(add(vk, 0xc0)), 0x081f43db8913d9ef66437b8037f93da94856406725ff0664b93c55c05cb939b4)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x303f39876417930dd107a28f1c95efc15d6d7b922745cbd412f3d7f5e13d17cb)
            mstore(mload(add(vk, 0xe0)), 0x148dc93a49a802c5c3132248128eb5c49a4257f9d25370c2056c27e15a10a76b)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x27a0435523b00acff51ce326549b504e8762aa6cb5304269dfdb7e8a17cf63ad)
            mstore(mload(add(vk, 0x100)), 0x0d381126cee8908a85d774c68d71fbd5b042a8f50e0a519e1c1b3e58c9f1097e)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x162f0f61d3c07e5a95d2f99bf9a826dfeb16c401f8aa0bbeb0e4aa4acbb385c2)
            mstore(mload(add(vk, 0x120)), 0x04e5347395fd5826c9114b46978c60693d12286cb73d8bff6c24576cb587b6a4)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0501f01134e0211d84ee6176ab2e1db43c0a74cfa956e7d70ba6211114985443)
            mstore(mload(add(vk, 0x140)), 0x0fbaa2c656980edd06a766cda76c2321e8f1d7f9074856a39ac419ac6105c059)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1acdb071f11b12f2220129b5aceb232a950032dc0c54c7b7e735a18dcabe91a3)
            mstore(mload(add(vk, 0x160)), 0x1f965cc5b50449d108045a4b5a3a784415d6313fc6341b84afa42aa3c58ce65f)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x20151d57ff77279db52ff3307233b863673660151581f0bfa3334c1fba380f46)
            mstore(mload(add(vk, 0x180)), 0x10553887c08323e946b64c62bc95150811ddbfd8843bc9462601fa9584163a87)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x12ac1553b45a7b19134721ffe0e3502286f800f5b90b4031c9bdb1e784fa268d)
            mstore(mload(add(vk, 0x1a0)), 0x1ce2c6df2f76db4354275c55d1f74afddbb6feec8079a89faf53e8a807197f1e)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0191d1868f75efe2c2c712d24518735e9fd52d62c4422cd684e66cf30dd758fa)
            mstore(mload(add(vk, 0x1c0)), 0x2e4a9a00329f158fb67bad526f66a9da42b500709264f79e2ffb91ce6f4d99ef)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0811c688f6a54406e55946533abab3285b263140ca2912991495ac7ad37d2fd1)
            mstore(mload(add(vk, 0x1e0)), 0x1d146e1af4d32f7ff69ca6b86512af7c81faaf5289024e059d0eb51359d28270)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0eda454b73101a6c4cb9925dbc179dc3105fbab8b037f2f49fcca4eeccec1d25)
            mstore(mload(add(vk, 0x200)), 0x238f4dfb247baab70aa0866c7c86378b61dd4ac757c49b504789f78f0c5c6cc9)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x302a4f306de1e2c302307d143bcee20aba400411376dd347f15f59ffd3e519a6)
            mstore(mload(add(vk, 0x220)), 0x2fb533042a869f138aa84979d5873c41b582d0539ee29897595c0c2ed1546414)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1dfed7848727a6c46fb52cc881a5c55f3d47ab7a739663593b3f7d3eb7140c1f)
            mstore(mload(add(vk, 0x240)), 0x104b3878c812076fc14bafec77048d9c3ce4af9ec7faa9919042b85052932a20)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x10d325050091167f075ac23be3343c72474b4e502f52d11b0eab07c758341f28)
            mstore(mload(add(vk, 0x260)), 0x05a7e46299f5b955528f0ad610f5e690c3149e6d8a808687d495ad8e75b9a298)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x066d856e56591c560b8d64a1c4e77190cdcd2b13d363b77027ad8f21d562ef75)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 35) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

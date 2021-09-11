// Verification Key Hash: ea11000e2dbeb58a93b070cf2f568680042c862f7ea2e9d44c47a08a9243e7c8
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
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x005d31a6a124addeab7606901acfa6657c1b5c3f67248d22a43c67f9ef7c6010)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1d7e21bf1e97ed9b6ac5c501580ce513b073485b09adf56b0aeacff52f5758ce)
            mstore(mload(add(vk, 0xc0)), 0x1488475c3e1f09bfbf0597e8da81fc82fb138bcb19c866db3abf8780f9b8ce0d)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0bef0bff168be7e26ecd88f9826b2233aac86a2aad9a8c48fb91d4559f3e8e55)
            mstore(mload(add(vk, 0xe0)), 0x2d7c8b8df4f07825955916ac4ba512c49051de880854fcfb215bac55e2844b77)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x27ec9ddcb73996720758aad0f153127345724762d0b4956b8a5b32187c908abb)
            mstore(mload(add(vk, 0x100)), 0x184487bd6f125258ac592825788b5a20daf9c6d1070c82a6f6d03d1c79e3d194)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0d61450b4c03edf49b860ec36c72de79427a1f0777ea213f7e1acd0411bc0aea)
            mstore(mload(add(vk, 0x120)), 0x2eb0a89d1d1a2f10804a42d35fdcda51cb2b371787f3b5a9381b64bef11fe55f)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x01e2a8595ddde1c0494db3885dfc3a29237d73a43a395f8938532c74146930ac)
            mstore(mload(add(vk, 0x140)), 0x2a7fb6c94708a07d7c962ed1948d9e30fffa9dfdc30c89ee2793fb2c0962d6ed)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2624b2f987ffa956d1584fbe9959d135c433824e45661c70bba9290fac930b02)
            mstore(mload(add(vk, 0x160)), 0x1a0749f53bd9778daca9d86463da8b1956ccfcc9ef51975b0ca52127dc02c0cf)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x01972eccd9673b01793b920c7a483daa5964bc0ca529cfb186b4356e3089c644)
            mstore(mload(add(vk, 0x180)), 0x12f7aae00bfbfa19a7f84a424ef628c7680186e7f16c1249844280a49baebfaf)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2cddb0eb7ef512ff6666879ea516a0e64c7136d1f9cad06322605641a437c4b2)
            mstore(mload(add(vk, 0x1a0)), 0x0feac83318813e4be417c976c26d82f36b1c83841e97723d876f742a92a56947)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0e31f1c3fa2091c5af08ad1d15346233f6ca00f7a9d91d9b2db237ba5cb5a6cf)
            mstore(mload(add(vk, 0x1c0)), 0x1664f9344f6520bd75c003ad0c0d044f4b2a221d01f86324d14ec6e9ffc88451)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x12a9af1c16cf5a473998284ca0ef2692497bfb65f99f9ad6c604d3778cb07ce5)
            mstore(mload(add(vk, 0x1e0)), 0x10919e937affa7dbd078e1687e3cf4b2993fb3b5f03bf6c9917dfe8887c707ef)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x251655717b9df4b8b1bf3787cd0305bafb23061c1a42483ad69bf788a8ee8f87)
            mstore(mload(add(vk, 0x200)), 0x2cc95143bd7b74850519518dab2abc66c873a2c3760c4f6910e13d278b6b9c20)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1cb902212a4ad2a3faf38f74694d7bf119d75e9e13345c0fdf10bea4c6769c55)
            mstore(mload(add(vk, 0x220)), 0x1b99dad02feea1f0b3b2464d49e33cc56fc5aa8114b5b5514f3e7f6e04fa7712)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x079dd3f9d65659f658b36352c8b1732e7276c2a171a6feb9da8d0eee4d3caa4b)
            mstore(mload(add(vk, 0x240)), 0x2c561e233260c3eacbca9f32b857643dd6669487ad9c80855f958cdfbc9dd583)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x201fbd3127034ad50b9ff01fe833e8a14f3fc31b791f096c3efa4a2c29899cf1)
            mstore(mload(add(vk, 0x260)), 0x1c928ffa17a8e1eaf563ccacc231581729f6a5a9a32c4a8f569cfb0367b80349)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x14a26de4b58b2db877ff608c8bcad16fa5f59816c795cbd5fea5f8bf732e27a2)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

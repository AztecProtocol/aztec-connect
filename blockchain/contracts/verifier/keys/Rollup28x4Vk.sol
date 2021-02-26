// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 1566) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x15cde7305bf040ebdf69643ccaaa6e457b8b5ddbf6372cbc9920cd131932fee6)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x10f3abfd58cb632cc3ca521caac020b18f9d68dbb6bec8a26279ec066a3f35f4)
            mstore(mload(add(vk, 0xc0)), 0x04f20961b7fddaf7e996ed549562c4c7ee2024964eec50266237830166f43b5e)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1070e25ceaf135940f6edfeeea15ca3b569d9bab73f3e8ceb81f0c5eeee4a403)
            mstore(mload(add(vk, 0xe0)), 0x18f8e63faeeac3bdea214cef496c86157129762b084cd998b58996e2128c8c23)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0a2e09272721a3058a18e67bbdc3ed692077da867890218521942b2843f98331)
            mstore(mload(add(vk, 0x100)), 0x057d116c25cee4582ff5d8abc4f513762c14c85f52391a74c77cc3278c31eb0b)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0f5b614f99639ae163fb233758937728f1a7a8f6b793032bee042b7010104c58)
            mstore(mload(add(vk, 0x120)), 0x01209c83527bd3b7cfcc84f773aabc98dfdf8219f1b815d767f5545393c2e991)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x08b2898b0ff93ed59c94fc8163c9cdfb70649a5763a65081d4101b5fa8dfbd19)
            mstore(mload(add(vk, 0x140)), 0x2a25af73d1d1e18e6996fefd4c93f131d822bcacc697cef6a4e01bf7789bb6f9)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2cd7d2f7991441dc21a9e03433c71a4472397cc6d26eab31b736c733f5e31cf1)
            mstore(mload(add(vk, 0x160)), 0x0a193f0cf79b430d0e0a563a5b18890d133071cd13e6dbd387a4c122d4495705)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2bfe8dd9b3721cc2b2d8e7f227f1682838048d734c04396e02c5749035174e04)
            mstore(mload(add(vk, 0x180)), 0x055c5de129f19793389c3ce9b5a3ccb7cff247cc10d730a3b49eba7706081221)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0cd78ca48d4076ca003747875c01c9ffa971ca8bc7128ee7aab1b929b67542ec)
            mstore(mload(add(vk, 0x1a0)), 0x1d76ab4aa28048497fc48229c668449f3bbf7948cd12beb6db95b2226c756b7a)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0bf05f0416a2076ee22c907c2f83e89f51692ca20e0110a06b2c6974c43f9995)
            mstore(mload(add(vk, 0x1c0)), 0x23a35b7851a65fe59b1875aee30de567ae76104bc64052761f714dfa003602d9)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x22e7293cdff7bbf4a494781be5a653c559137c0e5be22c0d64adcf03242f457d)
            mstore(mload(add(vk, 0x1e0)), 0x0b224dd5b9e2a0382044e7f4a7da069e36d07c9967a6374bc027db3f146c5970)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2199763b1e7108835424f82c983f16788a9035255a9cfeb89cc82be44e617540)
            mstore(mload(add(vk, 0x200)), 0x08ae072fc1a74e9076fbede3c25b1311ea90a36ae2f8901d17db2e91c2b13d55)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x18501b839feb78ab86be66c1692e632b291dd2f787fc608cedef72b82518ec4a)
            mstore(mload(add(vk, 0x220)), 0x165b3e3cf3ab8c447ab74861ba5a556da1038e5240551b8b4a2c03051f4fe32b)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1bb7e00fdcb47173facd19b390514c74a163255f0ea4f724bf5c8d10dd7c4c20)
            mstore(mload(add(vk, 0x240)), 0x15882a6b69d15bcd330bc4bb7e250f4f75b9b80e6e6b6d9e79746920086fbc13)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x303399a0c0dee5d2177a5e11de42807970d61e4bbb1181d7cf8aaf5775cd065d)
            mstore(mload(add(vk, 0x260)), 0x15892f8ee69a7bea477e669289454f8c78d894ab8a4df1aafb8fe7e57128da4b)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x252f78df16fe34fcd40738256d9414c4e528a4d9040a84257b1e37a9a9844b37)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1550) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

// Verification Key Hash: ae2c7e95fdbdb1409097bb909b5dd63501f2efbcdc4d144d7a940180eea900c2
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 88) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x00e4d2a106ca87f130be98fa2900a07007e1109bc3437b81782b4063963b4803)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x044269b16423b46e45bd1ef99a5ac92247f2086629eefa7ab650e2d82b2ed581)
            mstore(mload(add(vk, 0xc0)), 0x2c906fd2e5c18bb037871c7aaa35d9c0ed3371160644df299b75c5fc8a78ae80)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0fef99b2c3614cc969aca2a4ed140d82814d9b39e65ee1006120d9fd17dae33e)
            mstore(mload(add(vk, 0xe0)), 0x2632d49e90565018fedb0d48e8e9524a601d6a66a35db2054f76c8514574aad6)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0f0b1935ce17d8a5ba3eba927ebe7e7b03a994d7c43d865cf5af3a670f8e6d4b)
            mstore(mload(add(vk, 0x100)), 0x29c953adf411fc2508f72bb236e9f206c2f0d84389030e8cf3397422bda9a135)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0055c6db565cde74d522ac1d314df57fe7b332c77fab5cfdc83ab61ba2fd8d67)
            mstore(mload(add(vk, 0x120)), 0x03460935fdbcff46e3ba3b589e8311fda43ab5cb7b7685e07f2ccabd305e4657)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1d46940a31da5c74c6a5665c04ee8676062c6ece550f0893f1c49a321ede9d64)
            mstore(mload(add(vk, 0x140)), 0x29845faefc80d5b0a6a24ab20405a5488eeedec497e2894fab87802f28c4aaf1)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1859090d03acd1e79ad1c1d9f7c4c47cf09444f68b89ad18831c0fa7d239f468)
            mstore(mload(add(vk, 0x160)), 0x1e71a493d8a99b592a49c065d4491d650199ae2d414e01c16c46743a218af210)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1311ab02b285b8c6115448f436626fe91806d21a08241fb3e7ee2ccebbb70cab)
            mstore(mload(add(vk, 0x180)), 0x27720f778d540d98c0714ead63ea9cc305530970fb344b8213e30c9c0af33340)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x00ce986e2adc063bb6f326b9d0193ac4868e54e1054dc0d7ec1c91bacca4a4e6)
            mstore(mload(add(vk, 0x1a0)), 0x1932a6f3326ab0ced1f3e3203ccecfa1502fede534c0c096f31208aaa9b90bfd)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2fd3389bbb6368dc26b2c6bb75267c3d3aa1c7c0a0dcea6985e6150098da41db)
            mstore(mload(add(vk, 0x1c0)), 0x1939634eafdad023d8b310c430061f7d864629422581dc946592f09b8a26829d)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2bd0e137578d13c44d01a6a0a1d18f5150d1bb5fb1f35a8c68da89cdb8fc1fb1)
            mstore(mload(add(vk, 0x1e0)), 0x0e94e2be5b0d67a0f7d5bec9505014059cb3db401521b340aa03992619e0f4b9)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2847dc588d77f83fedbb45da913807adc788625a030dcf51417403d29ae153cb)
            mstore(mload(add(vk, 0x200)), 0x181b9321e60c231b4912908c0212a2a527d5b224f831d5b05cadcd43d52a26b9)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x04a4d8d9ba4b8eaa70544709fdef46a09762b7ec716779997dac0f17a9e5a0fb)
            mstore(mload(add(vk, 0x220)), 0x10e488b64d92333e54cd5b5d8f5d08b15e9146c2b4fac0cc2210141116328f4e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x05366dc763d3fcfd9f5f49cefd19a50deae538ea1bbf9c06c31c634d19d3ed3c)
            mstore(mload(add(vk, 0x240)), 0x14ee4ee9a4b11a18a726c33f2d30e9470a295505a5c451b1eaa164d740edabeb)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x13840009625da52ad85cb4ea2f6e61314d0e323c0ff9485cf08f8935328bce04)
            mstore(mload(add(vk, 0x260)), 0x23e1af972d64f29030cff7113da9ce4eee9268e59fdbbe520874f9f7c75f89a8)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x21e6fcb6210561fce694ca6b8608f896483cfb4d09082b423a31fe27899e7a6a)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 67) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

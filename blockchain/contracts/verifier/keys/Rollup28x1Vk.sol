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
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 414) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0751c67ecac7630a454686c1e54d2fb210880eb514a8e04ab68978c29e81b63e)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x229073c6c73d1fe0146728ffa776eedba952df17e36b4dcc7d2c68e796700202)
            mstore(mload(add(vk, 0xc0)), 0x2c006b7cd574e2315daf5f7f85f76dcb5d207dd85f29cfef533c373133a074bb)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x026ea93a619a0065e76790e2a2ad3ad1f0622587cdd1d16231e647d4a9829131)
            mstore(mload(add(vk, 0xe0)), 0x1d836b3fc13b60528d821bc84eaeab2b9ac5709bf4486f176d14b728f72e8f92)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2479b155d25d75fadd33d5a222d2bc78a95edac75d82356456f922b11abc0c74)
            mstore(mload(add(vk, 0x100)), 0x112739abf96fa79269e3f7a5ebe9fdac18fa8348607512a8daf50482900e2f71)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0a00a416def762930f47389664ad263caeec3c5de87a0f3542a9032d00168da2)
            mstore(mload(add(vk, 0x120)), 0x20a5dc08944e7d234cfa2b44a017176ea71530a6121382d2f7a7f4754c4a2278)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x258fe4c31ae2e285fa0f58a1510c562c50d01c4258bd6f2e5f4e3171c6e1944c)
            mstore(mload(add(vk, 0x140)), 0x2b01a26299cfa17da8198035e62e67e305515d3ec3391daa7200aa64fd0d7a36)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x3000d28c6608d2698782234a1603bf41b8a355f635aab5906eaacefc7a2003b8)
            mstore(mload(add(vk, 0x160)), 0x286a29d8f6494b29dccc4ea3c4528ae03f656b06027c0d86ff58655192fc2f6f)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x095233e57d3feadb033abe1346412880387f44668a853e43b542193d4016ae55)
            mstore(mload(add(vk, 0x180)), 0x06442ed9ed579f0f8b28f49662ab0e2b250b0f3f4a3e6ba6d2598518fd4fb859)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2afa59017b5c64caab8c2f24044d3daaf4788ef7a969501add766b713320f755)
            mstore(mload(add(vk, 0x1a0)), 0x0d2385327495b57f93ab894a1283b858851bd59a7f52939bbe41f1a69fc0ce7f)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0df576d367982f76746d342891035efef57dc0bc3210796f944b1ee75366d452)
            mstore(mload(add(vk, 0x1c0)), 0x15cdeffede1717b81a6b908fb7e73c7c566b41ec9e7a5cf9122a00833a7198c6)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0e3e9328db1a3a30c06f71a4610f74b0a83eef8423a687a53d5aec0a889c810a)
            mstore(mload(add(vk, 0x1e0)), 0x109b01ea2bfde695e0ba94225224af50d06e907206c1d7990447716b5e4a743e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2c3564edafae943b8b3bc7cd9e7a14ef02d605725bbbdc11d43c78265f920f2d)
            mstore(mload(add(vk, 0x200)), 0x143bb1fe980ed9a77d8371b6781a11e15ed50f7fa55ff0f87ea39383535bd070)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x040ea0b6f74d815e74c42df01e4a20bb25cb961af713dbd953061fb111167123)
            mstore(mload(add(vk, 0x220)), 0x0d6e6bc16cad2acedb3c9d6d920ca52c6c6780faede65716de23501401cdb348)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2340d2bdfc9ca0323980c879e7c85d2ceb2cd0177c5cf8a87e288bfdb4e291e3)
            mstore(mload(add(vk, 0x240)), 0x26ec64d303278dd874f42cd80d80c1482dbf9443189ea2cc8e66a42c6d59956d)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x08b0ec54ae3f12dc56da1602c213be21877da32aac204c171b3ee80be6586533)
            mstore(mload(add(vk, 0x260)), 0x1d8d66c676adf883f520fffed1e3ee6401a05aab3b3a426f76a82412c8cc81cf)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x04b8bf99240e447613a05b88e13c49bbc9fc997d90319f7b25025eec4feefefd)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 398) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

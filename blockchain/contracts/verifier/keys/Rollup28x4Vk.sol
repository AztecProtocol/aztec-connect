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
            mstore(mload(add(vk, 0xa0)), 0x0622125c4b852fd0ef25e6b388c447c3d88fcff945cf13898852b62e91280fbe)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x234df1b2a7df5be874b9a10c13dc60d94b32f4506d8f0a2145dce59a47b5d070)
            mstore(mload(add(vk, 0xc0)), 0x28c3c306fb48b6dea46ee5ac66a7618279f92bcc1877e70794636564e4c6156f)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2eb874e42eae37737f5c22010240a5ec916c01494ed16d774e5f41876ae41e9b)
            mstore(mload(add(vk, 0xe0)), 0x0d1e33e630b975a33760050fe8885a43db4d2f5122e5fcb94ecef20eb980aff9)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x038721a5bb474c817b3f41f8c6f71a1666bfe2e3445ddbc3cfdc7130623bebd3)
            mstore(mload(add(vk, 0x100)), 0x1158f3a8391ac5e4003fa173ea384fe51a1998a113880803b5cc1aecfa0aed3d)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x220dad6630ad6bb541b59aedb4cb638c98e29f61f272f08c00bdd1a7e8abcff9)
            mstore(mload(add(vk, 0x120)), 0x04578b3c524542c413ace8e2c6fc8c90b175ef1642ed840dbe7087b3238f5d61)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1265e93ce2cf3ccd5bd203f2bc23f07e2a7e766109b787723143d70ff23e5de5)
            mstore(mload(add(vk, 0x140)), 0x19add4a25014b7c77565451882136caa4d8a6f7a54f6ca42a562fbb09b2c5db7)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2defbfd386bff36ed819930263fc43d7a9f03863c75a9c1c13d2b1e9f8bbdcc7)
            mstore(mload(add(vk, 0x160)), 0x0758b6c2ef3126105ef4118042b73234dbb2b30a0949fc8ae2928fa04725e4c9)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x00bce08a6909a9ce4c2ed85ce1cd25b554dd915dbdf55201596e2f9205ec92e6)
            mstore(mload(add(vk, 0x180)), 0x2143dc0665ba090f050fdd7094ff1230f1a8fb1e192d3b41e3b23d6c71b4870e)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x302f04fa836718f182619bd53d37270bc19c0df44382c40230919ff386185e5d)
            mstore(mload(add(vk, 0x1a0)), 0x0523a0a34552e6d88ade0159c22e02b161319dec092fbd86656a99e5f9500fd2)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0fecb66c9aeb2eacec66a943685a2610dbf34daa8ab22190605dfa3f9c739f2b)
            mstore(mload(add(vk, 0x1c0)), 0x2aaf30fb73b6f6a1989ca935a0ab07f4eae535c0cc7fa45921c0d75fc4c8102e)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0f2f9c254c01c78f9f81bbc3c521fed42deb4f9d0776391f67104b8e3ef4f579)
            mstore(mload(add(vk, 0x1e0)), 0x2f9cfcda7509c0903a124a4c7c8e6abed8be32bdffa97c0fd552e07534fba046)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0bf6ad133332e36a9e8d4666bcb26b7a895992f580f55255b9fbf79c1e4ad499)
            mstore(mload(add(vk, 0x200)), 0x0f1e498d31624d3affb3a8f73d6b20e1456bc4c8d93d89f8407a3eb4bb924b31)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1ae29045593e2a9de0262d95da39b799da8b87f1a52bfa6d0b691f01f399d611)
            mstore(mload(add(vk, 0x220)), 0x1a1b0614d90537219ae0922149afc9415bd8f64e50eda7a55924c039be65fdb3)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1fc72848ebe77952f8a89237da6ef864851cb540d9d5afbfc7eac9c7a54644c4)
            mstore(mload(add(vk, 0x240)), 0x2efdbde7ae53d541ff526e3981ea66370f4d639c8e6ae7ae589da576b80aac06)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2e2ac699a73f7573844d23e5bfb69af9c42fd9b14014e857a02e691a190fa1ca)
            mstore(mload(add(vk, 0x260)), 0x113d0c7629c021c873ef717487658eb15e73c2dc8a58baf721c74f8f85143f54)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0d879172c7dc736c16974a866535fbb3c89b9834a280bd775263e88c53aff5a2)
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

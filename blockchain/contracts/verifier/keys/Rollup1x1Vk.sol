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
            mstore(add(vk, 0x20), 42) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2cc26038a713f8b32cb7b3a8abe85e2e01fe603a3edc08f71b5671ce60cc236e)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2d875d273b9e0a07ff99eaad0fa0d6ce50e6da250ef04ef9fc189ead350b63c5)
            mstore(mload(add(vk, 0xc0)), 0x14358003acb0bd1f372138a054eff07596ffe6b91db1750cdb67dfc73e6af12f)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x19fe15fcfcff1e57ffd95f0e55794f88dc37846d8ec931dae6d18efae4661992)
            mstore(mload(add(vk, 0xe0)), 0x088852de2448e1123e3409492cef33db8c150d0a63c87957aef4587e06bffc32)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0589f975d7566b3f0cae0472033d9fbec369214cf11c11a988bd26071af56fc7)
            mstore(mload(add(vk, 0x100)), 0x1097701258b171854c8bd0a7571f11649c69db7e58597670ec91b9b4b6aba766)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x19387ad4630cd3bb63038b9e20b85da16c9c931cb2fbc130f6a41825d642eee9)
            mstore(mload(add(vk, 0x120)), 0x1905eb3926d039c2f0446421f14ad8cb55c4cdc6fbd3807734c1ea59acbaa8c0)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1354b6ed0043aeac4b451e978397b556f71adfa1e873968c965567100e9c9722)
            mstore(mload(add(vk, 0x140)), 0x26238ae94290ceec5ac0d5e90e6f64265c874e9d183ef36f7c855e32c9a4646b)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0c73d4a5cf1e6ac4e91955ff0d79d1770204a4fb8339965fe5e9f349ec64ff41)
            mstore(mload(add(vk, 0x160)), 0x265eeada1eead430d2c83975b576974660431bf520f727969bebfeeef65afb6b)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x13bb80fdb03fe408d0806b1bc2c4460dc8538bc50e67580a8abf16dc814b99a5)
            mstore(mload(add(vk, 0x180)), 0x2a44dfbb41b2818df3cebdbe4871341399c56956d17f6c9c95273e0a65c5910b)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2731b12af184e1543fe67a952002609590356a3064434f752545e520965c3aba)
            mstore(mload(add(vk, 0x1a0)), 0x1e9558821fdbadeed920158e24bafc7d92c8c6f3874398de56b7f3a5827a3d20)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x00db48e3b50462f252e9dfa037e3f0cdafc8fc0f48a262d0dfd778ad6782d029)
            mstore(mload(add(vk, 0x1c0)), 0x25deba27da9f8e5540abffdaea72c6a70f1a70b0e69749cb25dcc4d8166a1833)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x284c132e73db652707160217abddc03b83175a8348493fdf5aa365ebbdec7894)
            mstore(mload(add(vk, 0x1e0)), 0x2c536d4d7c77c6ded8c388d2d9eb5eb8b8082c6f4498c3e3025168880315ebe5)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x17907d56b67926c267abb2a5a8063146bc9f043fe641726296062a3d4d612306)
            mstore(mload(add(vk, 0x200)), 0x2fea3140ac2e12af271d2e8427084da5d262d9683afebfc6239d5af77ea620a7)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2a8d3cc15d4bf57bdf139916b5507af023a4cfb68df9508a7e0a203ff1f15af2)
            mstore(mload(add(vk, 0x220)), 0x2dc858c6d1de50a9918c1fa86e43a41bf99c8f5e29e67008c06e44c61b86751f)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0b3fcb25edfd3cd9146245b812f1662d209c3e3860d1866d5682dc97b41f22df)
            mstore(mload(add(vk, 0x240)), 0x10cffa228800ba038bb8677424b7d97f23e7f2b2fd08750e3aa77dd6753215ed)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x10a0dc65aff3e59ceb9c61b5376343a12a02da7444b70800deee13738c8bb0fa)
            mstore(mload(add(vk, 0x260)), 0x2fee75febba31a446fc5a7bd3f2c15fa5558988ff3b318ec759660b5cac007aa)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x00718ae2d8c45ba2437510ae0fad3dc659fb666e3ad1221ce5c6743be50c63eb)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 26) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

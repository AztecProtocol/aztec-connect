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
            mstore(add(vk, 0x20), 54) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x23b18f118d2ef765ccfa0a5812bd14cdf7b87118c2af484bdf130029a003a0a5)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2c9e42fcfa56de2ab6e6daacbb80c74410c862e0cb6d44e242cc30cd5f27bdf7)
            mstore(mload(add(vk, 0xc0)), 0x0e4dc6a44d20baf5e5de2d9afc679424e3c241ac839eb2e2d6f1e4078a94b567)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x27f968689ec1fa94d4927417b80d04636fc29d98454f5feee43d9c804fddd8de)
            mstore(mload(add(vk, 0xe0)), 0x115e8204fb6002583e9789ab4311ef3d23b72feeeb89e70351fab189822a73ea)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2c1a9ed72e58ed72346aa7a4fdad90ad27ea5dc4aaa4a026e82619f52f8f1630)
            mstore(mload(add(vk, 0x100)), 0x0097d095d906a325f5c55f76509799978cc1085354831e36e52e44994d863dbe)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x03eccbbe0316541ee1193b7d6a59cf0cc8ffd136fa0094e26dad4c2d37abc46a)
            mstore(mload(add(vk, 0x120)), 0x1382dde7b35afbd2c6977acec5f2780f3c9824d53e7625e0f7c4c82552aceb2b)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0077895d92313fe4d94434a9a256924e02755faeea085baaeca822f1ff3b72ff)
            mstore(mload(add(vk, 0x140)), 0x15d84e93edf3bef23ef2595a9d1cf9a39b66ad7356c744bd46fb8af6988f014f)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x04a4a7cc4a1a8bbccb449c3ca568efa2e6dfd331ca81021ad94fbcd539b0180a)
            mstore(mload(add(vk, 0x160)), 0x06b8a1b17cea2b870c6675cd767f05bc4135398bbc6df67cfc7d44b782451906)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1d6445659ac7a3829146adb820757d70d77d97bca056223bea7834b548c49cf2)
            mstore(mload(add(vk, 0x180)), 0x15349076a8245067cb48dbb42d991ad5d818107c4db91488b3a660b883bb5ef8)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2cb0c46dcbe4d299f149cd0dffea61f2c24509d0e3d5f4dea32edb47c720ba63)
            mstore(mload(add(vk, 0x1a0)), 0x16f07bf189dba77a9e5704294e0a19a2ff17466de784b1a68e0b46592ed397d0)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1e2ae5ef84c0f59ef1b6584b6ae4ad58e8f9d6a2d6b40950436140381d80a24f)
            mstore(mload(add(vk, 0x1c0)), 0x0a3114789cb047c7d2f3ac3b3d388ce4716994b3f5a29a6110e2501702b28693)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0abecbbe4e0ecc895f0d9685b7c474db481a51dea9ed2891bd5447a4c59543b0)
            mstore(mload(add(vk, 0x1e0)), 0x1e029cb97dbf87a2b9481e09b2473619e9ab1527792d4829f70c4ac465ff5675)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x26b72df0bd74390e3381fd07a784d4a0573ee7a2d9facbb43cea8ff77c27b5b3)
            mstore(mload(add(vk, 0x200)), 0x27fe2743ae56746b442911cfc9724c2990520bf7ea24ce6f34a1756b578c0f0b)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1ffbee2320167e7271b408a2ae45d807681e54b16fcdf108a5699bffe174399b)
            mstore(mload(add(vk, 0x220)), 0x07ea6f90f32b9cc82599c222799758502cff4979ab8b58a315df578024cb8887)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0aa4856710d0463f8dde53e6ae60e229294247c1b2dc3ae0fb1b733097b71a29)
            mstore(mload(add(vk, 0x240)), 0x2083ea49d5a291e2e4080f6bc47e524da357c2e66a2992097a1c28370aa8ec95)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0addf3187fadf8ceedb571ec1ce443f1bb88938eb7d5238ecec921db26d9068b)
            mstore(mload(add(vk, 0x260)), 0x12a5226bd23b425c150584ee6227037d214859ac0394009b883e3994d1a7e8ee)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x14f5e7b1f11c8b3693e6f80efdf6fcdedc8980be06c3ec9502a6e80ec6f5e2be)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 38) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

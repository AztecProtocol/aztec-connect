// Verification Key Hash: 4cda91c3af967b5a7303b0a65e0f50cd1fce26f6d6425927e2544aebc2807039
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
            mstore(add(vk, 0x20), 68) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x01489f8efdcee1eeaea35d508c3059b6728f961577220ba0874fe842b1efc020)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x04a97ad4ecf16cdc378d752188bb1a266e6381ba223645f1522c2967ed8e807b)
            mstore(mload(add(vk, 0xc0)), 0x1cb37dae0b54940c0735f004d85fc0b2d49e1d77c033b3c90a92fcf5d2516f1c)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x107849172d3a5d826dc872a6d7881f146769b9399b807cdf4e3aafc9540dc653)
            mstore(mload(add(vk, 0xe0)), 0x2dcdc583e124be0b777c51550559eec87e38073c524b9165047ade5053a88992)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1de54e4354918af5232980d0187d239199c06df39df4f95422bbcca93a1eaec6)
            mstore(mload(add(vk, 0x100)), 0x1d84bacb12aeca0a5a8b86cb95bf791c27ce5e00171b335bbe4e2e9b0c9c4508)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2466d42fe1049e8c6fcc15fd19557165e028c6f45d0503cc3b24b1b543fe736c)
            mstore(mload(add(vk, 0x120)), 0x19fd53c038ef7eea046e2a5f7dc1a2f812d6910165e5636fe499c6678cbf7779)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0d6fbeddecb770bacb1ebbd3b3cde903ebd8cbe146b0a6c57b14a9dcfccb0b31)
            mstore(mload(add(vk, 0x140)), 0x0dbed35523cb5e7fd06bbc8c2a8f6f86b0aa87c0bb68af59ae309a9eb1e5ebdc)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2f264e462450520897f19a2c4c3f639658776ac1638ce2dfdbffc5de344f7bd2)
            mstore(mload(add(vk, 0x160)), 0x1fc8f5f03e8fb1441957b0f88abcc604aea6af1107d1b3487a55f25eb433bbd9)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2b592bf1f2571d2a78b86cb893d4cdd540605a7c4d6b9db629527853d806ff46)
            mstore(mload(add(vk, 0x180)), 0x22f97dcdcb93936839402b9cd85057dd39140c24747627a1b11cbc5355aabae0)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x07047b3dfe8f25ca91edd31694da58ede91192c45a475ed48360a865858eec8a)
            mstore(mload(add(vk, 0x1a0)), 0x0211c5a222f8cf00c16c55ebe231c69c198e71c91e04fbb886adb179f6874b01)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x223c44ae2f5eda2396068a67980a9172a781b7f83a136fd4cb55afd1c2edc52b)
            mstore(mload(add(vk, 0x1c0)), 0x2a53461d2f9ca9e1b1cae2aac2c30e7d61bfd477dbf0d6f478f28cd80658947c)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x177a70d8b507fab2cf5a2596efe4f1c0756adfb6a80ca8fbb609fe0345f6ceee)
            mstore(mload(add(vk, 0x1e0)), 0x1bb7944a0e48ed74537c9329a169f4e6d371e03ffeda4fd9dd04cc237f1fc3cc)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x29b42b1ba3916e3ef365f890119e993737e89f2eca38725f77f1ed962d7217a5)
            mstore(mload(add(vk, 0x200)), 0x1cdc34a42bea1eacb91d4a78c194dabda7d184edcf2c5e04b22e6eb720b48012)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x204107b722dff128fd627f58790a0adf6f92521ac58ee0aa45f3a5c21fefd0dc)
            mstore(mload(add(vk, 0x220)), 0x0fca0ba05fdf9dc4c9fa18e38162707356fdbb81a1300414bf5df297b0dcd44b)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x21dd3ec763fc44f75c69a1cb3d12a7b1900825b49084667bc1919f22eb4e9790)
            mstore(mload(add(vk, 0x240)), 0x008a32f80187d2b947195441ae2e4afa5b1433338ad1bea05b5cc0cb0e1b5bc2)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0a4e662bbe3a36ed8bf706f80676d278f90342ed3d6256478f3d0e5efb8cf917)
            mstore(mload(add(vk, 0x260)), 0x0caef2c0d33773bcc06671f0197cebcfa435891de873961b116d967c77928640)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2592e3b9e968b0c7e8bf1a1e45f367886f8149fe58ee9d204fd3b316f97d330e)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 47) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

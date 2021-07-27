// Verification Key Hash: 7a31c0e7958eb2e0d4b332e31ad5406b0fadd89138606a8d67fab75ec5e99594
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
            mstore(mload(add(vk, 0xa0)), 0x0562d35a783ec419aa908e9baa6406e3404896790d9f7bfbc0c6197bfa52807b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x05b130362012b14099426b1ba0d9dbb3bbff2b01c3eac37973b92c0769d93bda)
            mstore(mload(add(vk, 0xc0)), 0x0028c4447be40bc7ffb67ab79257519ff7f9bb84c2705e0a414a3164f1a462fe)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0152fe6a9568a7c3c5264e934c0746641bb0860ea18db04b195d317e8cd4971b)
            mstore(mload(add(vk, 0xe0)), 0x2dcdc583e124be0b777c51550559eec87e38073c524b9165047ade5053a88992)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1de54e4354918af5232980d0187d239199c06df39df4f95422bbcca93a1eaec6)
            mstore(mload(add(vk, 0x100)), 0x1d84bacb12aeca0a5a8b86cb95bf791c27ce5e00171b335bbe4e2e9b0c9c4508)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2466d42fe1049e8c6fcc15fd19557165e028c6f45d0503cc3b24b1b543fe736c)
            mstore(mload(add(vk, 0x120)), 0x19fd53c038ef7eea046e2a5f7dc1a2f812d6910165e5636fe499c6678cbf7779)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0d6fbeddecb770bacb1ebbd3b3cde903ebd8cbe146b0a6c57b14a9dcfccb0b31)
            mstore(mload(add(vk, 0x140)), 0x0dbed35523cb5e7fd06bbc8c2a8f6f86b0aa87c0bb68af59ae309a9eb1e5ebdc)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2f264e462450520897f19a2c4c3f639658776ac1638ce2dfdbffc5de344f7bd2)
            mstore(mload(add(vk, 0x160)), 0x2314490c8d3fa6a84a5b8954b9f1e4252bf134c198925de6d8369bb147939eb3)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0b747fe6fe72c322ee22aca71f98810bd86b0856cc75a021df16563f300dad03)
            mstore(mload(add(vk, 0x180)), 0x22f97dcdcb93936839402b9cd85057dd39140c24747627a1b11cbc5355aabae0)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x07047b3dfe8f25ca91edd31694da58ede91192c45a475ed48360a865858eec8a)
            mstore(mload(add(vk, 0x1a0)), 0x0211c5a222f8cf00c16c55ebe231c69c198e71c91e04fbb886adb179f6874b01)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x223c44ae2f5eda2396068a67980a9172a781b7f83a136fd4cb55afd1c2edc52b)
            mstore(mload(add(vk, 0x1c0)), 0x2a53461d2f9ca9e1b1cae2aac2c30e7d61bfd477dbf0d6f478f28cd80658947c)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x177a70d8b507fab2cf5a2596efe4f1c0756adfb6a80ca8fbb609fe0345f6ceee)
            mstore(mload(add(vk, 0x1e0)), 0x1bb7944a0e48ed74537c9329a169f4e6d371e03ffeda4fd9dd04cc237f1fc3cc)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x29b42b1ba3916e3ef365f890119e993737e89f2eca38725f77f1ed962d7217a5)
            mstore(mload(add(vk, 0x200)), 0x23dbb9684c4517aba1bf6bd4abd3b9f8e8168799c416220b2dfbffe0d1d88ec7)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x17f1d0ba1fcc046a42f60ea4a24d1328756d21294b8222be3c1d085afb73f645)
            mstore(mload(add(vk, 0x220)), 0x2165190a530d5395f054535d15d571d32bd9885836f426f058044f5c7de0fb83)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x183ab25d31421bf7a0251636db665175d8127dff3ffc179b85c8e8df9d722285)
            mstore(mload(add(vk, 0x240)), 0x220d3f50e54311b296aafbbe1d574629b2f81bf6b874621688e1e322c2a44980)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x01e868cd9c17e73a713fff4ae927ecf76ea7ed46c7e284588b9129ec15e472bf)
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

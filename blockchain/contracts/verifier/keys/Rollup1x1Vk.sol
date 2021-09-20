// Verification Key Hash: 667a1ef5a7c155be0d1a5118cc6c62a5d8f52dd2d038df427645570a9001eaec
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
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x208bd870b135bb02897c195e4f753b6d275252417485aaa0e4dfe2e8ac77d8ba)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1b797fa03b46544add5cf1f4e0d30977c68c38e222b02f7c8d5d74b7187d7c2b)
            mstore(mload(add(vk, 0xc0)), 0x03047b2b91ca4e8f5388d828d7180ebfb0481b9d2839b85854d3e5c236450cf1)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x238b49465acc8f759f98617f32e5fff46fc8619f0a94e90a6b7b87057c86a7b5)
            mstore(mload(add(vk, 0xe0)), 0x2068985230e396e0288be2ee4fee1144cea818460d2b81613a676e59d3121f96)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x15b84522e94a28dea4953b1f8a5a007207640fb8565ecd6b0b6b330b2c3aa669)
            mstore(mload(add(vk, 0x100)), 0x15048dba2cf0cfac83f285e6bbec6c521ec9c8e888bdc1487dceff1aa0fb26df)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x072a29d927b6df21c0e4c5381cbee311558aef676a2a7f7ae7eb6d6effe9ce9b)
            mstore(mload(add(vk, 0x120)), 0x08b746fa9aedd44df7981c618b6f29b44610a23e0bbb688f5b9398f7b5183d08)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2eb913581a7edece07340717293db65d617e3f286bea908b3e4f0dcced7f615c)
            mstore(mload(add(vk, 0x140)), 0x229d7fb74791f236b90863f1d7a73306247707b8ebad3339dd961eb2cd548194)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x08069683e6c82fcd243f56062a88861637b66ceac6eaa09c14738f0fac636eee)
            mstore(mload(add(vk, 0x160)), 0x07894e2dcdcc1717a81a2e21cdeb53c9889919300ed8cf47bc4cf6e0eab1ca64)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x084b3026a68111abe49f222ec8c35e6c07843dfd4ca2e56ef928a396ddb410ec)
            mstore(mload(add(vk, 0x180)), 0x1859231e7b24c4f3528ea1b74b64f40c4da001eeb12fd500b365e3724d352c5c)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1ab25acbdc96a2fd1bba9f0d4a8d0f8556b31eff8268c6f97e7871a657e19785)
            mstore(mload(add(vk, 0x1a0)), 0x1f0d2d540dcb14d870c68d927cbd5f033a277263f8f99706cf042722145d9b99)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x299178839057a8fc582178d010b825ea2a8a78447f3d48715ce8132cb469c210)
            mstore(mload(add(vk, 0x1c0)), 0x093a416eefc33cb7b259f6660253c111bd812fb420ee06d0b3c331e2fd0d0d65)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0fed9137d5aeac38bdc2825ddda080f4052dc2d3bf48203c5db760d97e7b7138)
            mstore(mload(add(vk, 0x1e0)), 0x21c9bce69f652058a80b6807ebfce6597f46d17a7135c347af9b76b59a8f5d57)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x07d41ab55e3b44293b6a711f16e270eb339474d0b81896c13f794c9496ee38ba)
            mstore(mload(add(vk, 0x200)), 0x201bb18b97c4fe7c401430a68a187471a95e3392748c4d65c2b7ffd45d1603f6)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1b2776552bb288c36bcce745e9e7ef4f385095e047760e045c51092a91e7195f)
            mstore(mload(add(vk, 0x220)), 0x04b4e47fd74986c40e135391ff7df4467949f26476110773ad03d9cd0674ddf6)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x02887cac73c9581b69afebce6c7f824bdd9c43d727c7d26cbdcd211528afb619)
            mstore(mload(add(vk, 0x240)), 0x2c6f0cf40b17898682470bd86dce4c8f588af28adcc63d375bc8dfddca0f10f5)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2c30c75d336c3026b20d70f5e4c3de51da24ff40ceceab01418e29c805567bb3)
            mstore(mload(add(vk, 0x260)), 0x2fc6cdc76b30cc24f4d670228c5a8f13dcd1251cfb403069c21b74ce48570dc2)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1c01d4bfd971247b24692703fb26b343d62fb4ef4044b01855b6cb3c16cd9b67)
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

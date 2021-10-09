// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 798) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1abea30d53912aee7522f20f29d01389b7cb7d67ce17a6c1ca45b3de1aad11f1)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x14afcc699ac43b67c2ca736f55100e58f37003864daa5c9544781432dbfd4154)
            mstore(mload(add(vk, 0xc0)), 0x0523fb219abe98b81e8654346e53e6d6c507bf5f685bcd0edfee9955005e6bf0)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x19c414f15b17e9ed08789e0668b62cd174b418e6710589260b151fa1f0027e76)
            mstore(mload(add(vk, 0xe0)), 0x010bc3ead4be19010a947e93b74502b0a68a325814febc1d12ed6a5f210ce4be)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1bcee361dd366ab926412c2dabbcc08f4fc9442a428806964233521455cee065)
            mstore(mload(add(vk, 0x100)), 0x24a8008693fc57ad091582109982e3b25a0418b269c3ca5a280b57ff5002a963)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x09a2c43c67fd3f46bd796027480bfd90711c3436513b41e32f5337313b49ca2d)
            mstore(mload(add(vk, 0x120)), 0x0f9b35dfbfc053ae2d9851db603592d0677adb421344ee3092d89762baeee2bd)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x042991d875a23bfc9313fe549ab8d97897ad2539cff77007e12a87d7f3ef4f3b)
            mstore(mload(add(vk, 0x140)), 0x00117b23fd1597591b4af77aa6f826652a50caf4f0d38742b610eeae2ec8fcda)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2fd0b7414005c557195e0066c6f68a572f659cd814ba52169da3702142b3f691)
            mstore(mload(add(vk, 0x160)), 0x2ad58c92efa1f837ebc0e68fe78e9765111e8ca9378d92179778121d7d788d4e)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2451380d79a4ff81faea0e47d35342f123573be83efee575f24c9aae0317ebfb)
            mstore(mload(add(vk, 0x180)), 0x0a25f3519a6ca59eb4586ddad732efde69ff72bd021d3aa0b7762c7c11ac2a44)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2af84157ed8ad63a52c55c2af0027959300a32d11cac2c17abdc9b45ca588df9)
            mstore(mload(add(vk, 0x1a0)), 0x00be1e9db91348856f8734b12ef4a397068f9d3434a83b92b263c8f09ce11171)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x027b02495923da0cc31bfb863845c389992c8113623e06e92fe86b89f318f9cf)
            mstore(mload(add(vk, 0x1c0)), 0x0af45acfa50fcaae10e890b9d3791011bd46fbfb5769f3b65fd0b7ac8b9ddc89)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x12adc64c72997202645a0093acd8df36deda57f71ea642a534a022b4e9dc2810)
            mstore(mload(add(vk, 0x1e0)), 0x27257a08dffe29b8e4bf78a9844d01fd808ee8f6e7d419b4e348cdf7d4ab686e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x11ee0a08f3d883b9eecc693f4c03f1b15356393c5b617da28b96dc5bf9236a91)
            mstore(mload(add(vk, 0x200)), 0x0fc3f778b5453dbbdc35d10a26227dcf5b3be93c2c8e3ff72a6aff949e6e5992)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x24478aa4765e7e0f2bdef5e2e8d7852da17be6d873e1ea980b9686ab3378a5f1)
            mstore(mload(add(vk, 0x220)), 0x0e4387ed08c942b8f247156d23991cec4509b18f798b3b1c7f20a3b57a97b52e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2404c37b8588c83ab34cbfdaf41605023f5059eae4739410551a154578a34a7b)
            mstore(mload(add(vk, 0x240)), 0x036e4addee9185229b8ad3a460eed26b04d43478c8f7898356088db58e22acb1)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1751ca7085fa315fe3ab85c7739a1a8f389d556b4c82974b01fe46b71b48fe9b)
            mstore(mload(add(vk, 0x260)), 0x2f79cbab3a285897d2c01714c6d4908dc607e4eb8d983ca2cbc6f0db3442d79f)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x108a14da6cc24c4aa15cb153c7cbd16a03b68936485277469eda9577045942f6)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 782) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

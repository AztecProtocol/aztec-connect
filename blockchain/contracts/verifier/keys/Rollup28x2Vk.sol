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
            mstore(mload(add(vk, 0xa0)), 0x2a7d3ac3ab291cf97cbea8d6df19e7f7ef399960f99298777776fce73184d436)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x175bc9bfcce438148f41258eae2d6f98db8948aa7179272d7450f3cde754aae4)
            mstore(mload(add(vk, 0xc0)), 0x2cc298df99321fdbe8ef84c15722ba059da9f99cbaa3919d9edca4e1ff73f63d)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x171103f5237184bb424ca7d45fae073f0eb9c94897a1c4c23916506d3943d07d)
            mstore(mload(add(vk, 0xe0)), 0x184aca5cbf50be3bf44e27a2866c4b82f5ce5b432543d458da9e62a8f8347c90)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1f9e41dce60049cb7f8601b012515d542f8b73e49f07818b53e43a0c48985908)
            mstore(mload(add(vk, 0x100)), 0x27567ef240cdae19466322d234ef78a5b54c44fe9e6d18c5aefb45ea1b9fb58f)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0664ad5ebbb9e3e3dab5df03882798a3f609c784f26dc6eaef69eba99c5618e9)
            mstore(mload(add(vk, 0x120)), 0x0de7f4fce898217d8f647f8398f24d2c0c761fdcfbe0623b2c8d32d1f0464296)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x15a75f8f2a74e531c3754777d8dcfdfafa519754fffb731e87ce06adc67da196)
            mstore(mload(add(vk, 0x140)), 0x1a29e359d4eabe9fdc96fd2dcf551a300105619eee8524cc889fb5507fd26190)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x09eb8cea053af8be831b6bb142e008e44366f06b2939eaaddd9daa50f57681e7)
            mstore(mload(add(vk, 0x160)), 0x2bb8d94b933d39c7bd7a13ba28f9d710a2e4f5f1f20e383edef87e62b1b4b946)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1c3022b7bcaa922da81853613b6cb710e4582f8526a309151d5ecb894de49c2e)
            mstore(mload(add(vk, 0x180)), 0x2d141d81635e4142a5b7a2464c0c9b380948f80ea88e6ea643808961ea1d93ad)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x14eac0c95b3f747d94d7d95e61609ba8cb34a3c473616dcc264b4cf210fc9911)
            mstore(mload(add(vk, 0x1a0)), 0x1acd4a353ba196e68a0fe3e9cf8fabf07b5626c694234858b62e2c57bf6f5fa7)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x25205fcac837d8ee2e5a55c1f56f4e58a7d38fddec96ae52ddb26258b0227934)
            mstore(mload(add(vk, 0x1c0)), 0x1b30408ff7c9401da4b8ad60be0f8a81cbd005de7778717195a1c3ef5731b0c3)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x21d94a276fd892f828e3e4db3cc3fbd5fab6a9c9a50904df5134133cd10794f7)
            mstore(mload(add(vk, 0x1e0)), 0x021ae51dfdc35471fbe4c0eb4339dd2d23d4c2f01b1baffb8b186ff8a50d415f)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0c8abb188aa9c1e84c058a8995731f353e35c6e37ae97598a5973432b0820270)
            mstore(mload(add(vk, 0x200)), 0x1d17f70f3bacc45af3fde7012ab94042a428d3e8104248ce13f0c32acfc04f14)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x009dfd3e2cc720105d5eb636e82a134b5c4cdc11c0e228be3574b20cf0852da9)
            mstore(mload(add(vk, 0x220)), 0x098a7ae79b645a3e8f48dec85f1dce0f763201945dee0669d7c4d9591ac756b9)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2cca2cd8bf12a377e3b199e84c58b18541c32c5ca4fef65991ab138962f8967c)
            mstore(mload(add(vk, 0x240)), 0x264556931288e82a64d6d71c702ee72952332b50cf71ee959a0f667036562b80)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x21a06f38dbafd465eeed460fa54e6eaad2962c5a64ddcf00149fbb175cb365ce)
            mstore(mload(add(vk, 0x260)), 0x0abfbc2cb193caae3750e9a0a73fcc50edf2ea3caae08a4328fb06d933e7a7c4)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2dfba85859fbd97321d4eb0ddba4c4fab3f4716cfab432174ba3c567695d71e9)
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

// Verification Key Hash: 18b86455fadb785bf1a6fc6cef2e56e48eadcf195de397e972efacc9757adf15
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
            mstore(add(vk, 0x20), 92) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0027b9af126e0e26fed9d65894e7792b75b1e8c71f0c02068e106d042f511379)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1147e2abd7617f30130f9c3219bd4fd888806df9600c2f7a35aed6674238fb8b)
            mstore(mload(add(vk, 0xc0)), 0x1eb760ccb97ca46299d3e7146c148c9fd968b7cfcf3734f1cdc12136bb7591bb)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x084a1df2e46ad07b189e603e0136e64940f4bb3b1eb930d5674e9a3c4f90a5eb)
            mstore(mload(add(vk, 0xe0)), 0x00a15476d7fa908914ca9cb0053d04d7506b34cc40dfbf2048f425209d94f1c4)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x282880516b84204c6f1114cacafd056f34c1557cacacb8b50bc640352a750df9)
            mstore(mload(add(vk, 0x100)), 0x1f252b78a8aa1dc6765bfcf0d37cf14e75bc8a6ca6472f61f89d82ba64b7c205)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1166349ce479ab54e1ee5e495d96af7661ac4c2a04c6202a6f889ba8452ac04c)
            mstore(mload(add(vk, 0x120)), 0x086ae34a294522869f506aeb3f53405cfe291549a64f8e92c92c2c7787995f2f)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0f3d77c9f214ab9f915ebd589ade490f10967e39a37241e4836ed6c72568d419)
            mstore(mload(add(vk, 0x140)), 0x28c59343a6be31dc428b417694db821d54281e571b467c175bfda0acf29e2971)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x187a44a0ccd77b826a256ce3d9337a11b5f04818a7b54da8080feff4deddce66)
            mstore(mload(add(vk, 0x160)), 0x06cb58fc932ee5df49a54ee578ce74b235cd38d00a94079fd37809d02adcb40e)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x032f2049ffde166c4ff4d39fe41fca7b62832edd9d10c76eb739fb47bddc3af6)
            mstore(mload(add(vk, 0x180)), 0x1534a8e93950b9869c627c0792d751d6c897215edd6e69d3de7d612ef22e63b7)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x16b1ba93ba76a08a4e7c1b65b6283ed228b51d338efcfc670acf63fa4290a2d0)
            mstore(mload(add(vk, 0x1a0)), 0x017cb2aa699e60b17fdc680c59aeebdabb3fef0e3470ed8247f6ebae017e7b18)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x26a99dfe3f37a7449afbb6997525e8bf4173068bedf7f6b908eeb4bc9e05d087)
            mstore(mload(add(vk, 0x1c0)), 0x2c1455690853fe739c8ba6beee217b2c765bcb5d2ae9175a4a1936c75efb594b)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1fe6394af757770ceb7dc194df57fd83a907052113624496a2f56be8686a17cf)
            mstore(mload(add(vk, 0x1e0)), 0x290ae9f5d9b10f8edf76baec01980d402e9fcae28e57d535e85a759164cd7a39)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x166609e97e10426b08b6b0fffa274766d1d71c3051db8f0a91a6417b8e26ba8b)
            mstore(mload(add(vk, 0x200)), 0x0fef24461bca588d9fb85ae626e35f2321f03c9233739df2b000b7969e7d9d66)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1921a080eb1ddba128a665fa768c2a6518dd2449a1b0e743f5bf0aee98b2ce5d)
            mstore(mload(add(vk, 0x220)), 0x13ce00208cb1a3ecf7a2b1b3cabdd1ad58b9b867f8c4ce95823c1f8782bbe511)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x09170f26224065d887c46a62c855d238d578913890cc8c3d43db8b03bd237870)
            mstore(mload(add(vk, 0x240)), 0x0f44764198177a82fb4c03b65b0add344990e15fb3f41b6b0856a632c06ff211)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x23a8f0207abc84a97aff72a8ae3056e0e57565cbe0c1ea94a080fac66814c0c2)
            mstore(mload(add(vk, 0x260)), 0x1e58c9a29184cb7ed072587791413f7cd59a00d9926262543251df38ee89f757)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2804bcca13c3b5bdd7c3069a66cf27a39d3928434a54a59a7c9b528e5989465e)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 71) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

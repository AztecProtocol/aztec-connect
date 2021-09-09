// Verification Key Hash: 62ee65fe12d9955f65f48cbed112e35f320cafa1bf6122599ef13c959ea8623e
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
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0138c0e4f92fcf8b9189015f8b76aeab9b2efac814b3621e03c919b0186a8f21)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2333f79b36ab849bbdc450da210d18b1cd68b9c80f4f0e448110b4f77d63de86)
            mstore(mload(add(vk, 0xc0)), 0x11fcca28dedce3fc3711fddde873bcc01ce42f4d08547ca82308dff3a2e4036d)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0c7552b16f4474d4898d0078d418340420a09a924155f41ba3f7a806032ef24b)
            mstore(mload(add(vk, 0xe0)), 0x18c50ee2ae12d5c2f25ccae01cd8ac27abaa6c2848c33f72a9859f1333655434)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x131cb22dc8b446777f5a04e4d34e306ad2ddf10a306f51224bb360cc6dcceebc)
            mstore(mload(add(vk, 0x100)), 0x00245737479817f25994305821959eb8abb07b5c8585307334379b00726cbb2c)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1c01d35c296946dd003731815c1e25f1dab678030c6fb9a3c31a5a2d107e68aa)
            mstore(mload(add(vk, 0x120)), 0x282ae3634be941bce6670b4c14c6ff25943203c0c6dd50ef9d345356222010c3)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x26ed3d74fa8ff4a204a8b9e50cc9796d3cab5a4927d838d1bd4cac7bd485fd70)
            mstore(mload(add(vk, 0x140)), 0x03479a116ef5c87d0f2fdeed2341c920cb16af8bf9afa2a46224192a4e9b2caa)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1ee03db9b0ff6d7df8369f58a41dbbd98579c1c851d11ae07419d419001e5fe8)
            mstore(mload(add(vk, 0x160)), 0x163c6b14ccbfb5c637a69ebbd3a45e41f538ab6565805a3a1b1509dd5b9284f9)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0000f8da829122821bd5c60ae499019ed35e6ddee7c1ec23f4fd71bec6cd4ec0)
            mstore(mload(add(vk, 0x180)), 0x13c18daa87787f958a2ec775fa202c2f1af8126c95bd3669123093579c690c9f)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x301ac0bad9678395ecd8bdfb63e2a45417801752703a62d041a1cea8cb238fa5)
            mstore(mload(add(vk, 0x1a0)), 0x07d6126debb7b8fb42309c9de416059415d647264ddded076ef39db4fb758a23)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0e910b440a2b2026ebb0973a7def711c5a1bd2369db23ad00105e211028cdc49)
            mstore(mload(add(vk, 0x1c0)), 0x02b7ada7a3f30fb121bac246436df6165c60023291bcb3b8ca73c1ee0bffd7e7)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1703ded962bab75c0b00fa22e6a633c41a118e6486973b20e86f78c135ac510c)
            mstore(mload(add(vk, 0x1e0)), 0x026a52053e850427c2700ccea9dfa720333e4841c35c0d51820f7bfa221ad47a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x20430ba7bd755f0551763c592c15ea7affd6e11e795612713d22b2e29050728a)
            mstore(mload(add(vk, 0x200)), 0x2979da0b7e7d3e5660974abf15805f2ca49a51d5262cf287cb9ff972321022a0)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x304b0d6f170485f1c801d959677ec14dddfb0b4c529635a100be87208b7d7cd8)
            mstore(mload(add(vk, 0x220)), 0x2a1fb5a6bcaab63cec34b006e6073b978901623715cbd153d1f3b715616d8660)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x28800d2d8e6990c80f6d380647e5fb1c8db177fa80c2dc093e371e424df7697c)
            mstore(mload(add(vk, 0x240)), 0x1803ab90e6d6120f13cb66790e5e26cd31df4ef9617c8dcfcdfb2cb4be8136b8)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x18c4fe6bfb2c3e5bf8161cf92f8888e783166178ed012beabe60a6b1db7d055e)
            mstore(mload(add(vk, 0x260)), 0x2e5d11a840f44b53b3a7f982a7d233fcd95bd9f8dffdbc2430f186268ff68b5d)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x21ca8e7976001f5062ec9fcf0854f3bdf22045a3725c004f7b04d624acc234c7)
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

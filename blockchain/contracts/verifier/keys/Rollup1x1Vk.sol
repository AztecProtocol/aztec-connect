// Verification Key Hash: 13e1363934be6ead26587ea8945d3aab1c477ab221bc7c1962faf910b360f927
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
            mstore(add(vk, 0x20), 54) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2e768f04165449e434b94b1b0cb8fcd941ac22b0e03d09a0591adab3c4c7455f)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x06024b3584a02a69669c6d148797ab604f436f6314291fdb88b77f6c95d58619)
            mstore(mload(add(vk, 0xc0)), 0x26a500f694ffa9fac35ffd00aff5c470b001d2724491e80f95360b6ee0d9c597)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1c2c7fb1b2da9dd392d78663e4224f22e278e5aa715611d81603693f2de93b3c)
            mstore(mload(add(vk, 0xe0)), 0x1292105e06caf1829e49fc2b8605a881e95d17e68c6011f537b14d23d5283974)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2bff92f124925347bdb4c4901c3891d04760d42fd6d06518029bb8774dc82219)
            mstore(mload(add(vk, 0x100)), 0x16ee0a07b70c940521094171ac48e68765928768cb81136967bd8718af6f726b)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x29b5a0b1bbb6640b402368d80bceb659e70a96c5d44d4c10155e66c08e484264)
            mstore(mload(add(vk, 0x120)), 0x2e419ab560709b94674095599e146ddf1fc2c8f9c1007bfa0b03e803b4b0d0e4)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x265b355d4ac0e6f67d0198329a86366102f0c423ca490a20cec8c7ec932f15f2)
            mstore(mload(add(vk, 0x140)), 0x1f1b00bbd2cbecf7397367da68f39ed8f97dce677e8ee6907857dfb1a7fd8fd4)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x128cc540fb589e6b0c6fc614b6639e188b252547bb481d10a68edecacff6587e)
            mstore(mload(add(vk, 0x160)), 0x0102e999a74a5b3137d23cf0ae3b40c50ed10612e470ed5db8dc2cde9608b488)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x054009f14163b76f370ae9a2c6bd843cf862b0308405c24f1e5ff033649962ec)
            mstore(mload(add(vk, 0x180)), 0x297ed5a55cba6a4499274b3d050898312434aa0090c70637385b540f80902bc2)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2a8f831c9342872c4d58d68506a83ee241a642a8bec70143208ac629f87216ff)
            mstore(mload(add(vk, 0x1a0)), 0x043fad53460a3e80f7e656c99d0d67858d48254df989c45b19aa19395e6fc6ee)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x192ad9f552f291bfdfde81fdb1e799c3d13bacb5b881c0363f8b217db19aedaa)
            mstore(mload(add(vk, 0x1c0)), 0x0a08d32486dd54020ad13af96d5ef6000bbb2693cddb1f9ec598ec0964c93f63)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x16abfeddb615d9d0772f5595e2049a40041950a6b09b73773f3862d059970b75)
            mstore(mload(add(vk, 0x1e0)), 0x19b106829d915859c19a17dcc8f9490ca50c588af49648248c50de39c65b8fe5)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0d078d4d63d51b626f0ca62905f947ec05bddad63b74a428821ddb5dcc5ae4b0)
            mstore(mload(add(vk, 0x200)), 0x188cdfecd50c6351b3e749f43f181e737122439e36f43c9f15ab8106d80d7736)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x23f541a5323c7429b56407f8d0d793cb0e335c7166199a5408d490f2a7e60d90)
            mstore(mload(add(vk, 0x220)), 0x0de331ab54e53c8e4ed05762a0a1c94f96e644f02e22ff9c97cf14d7335f6867)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x26e663b70e90d501242158868910363111105ba87f8c154966df72dc1859d523)
            mstore(mload(add(vk, 0x240)), 0x01f683d21f66b1f9951c11bcdb505cdfe4b1abbeb2a3b3dd257d9eaf790e31f8)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2bc33c107eee58cc72f5ac2cd7190faf30d4eb3fa38f71643dc5807a644867d3)
            mstore(mload(add(vk, 0x260)), 0x261860ce4efcaae58b660c08b650c32f87c88b84deac5ec5b7e3cd41dc139825)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x20b60bd50fd62cd9f9c61ca144a7097dd50f887ee5f13e6823cd6115ac224cfb)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 33) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

// Verification Key Hash: c8a7cbac4645c3e237589c76f04f86fc890f0b298630d36dc36e7b621241df29
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
            mstore(add(vk, 0x20), 58) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x19d5b7233e22912ff7bd75d9a4f8935bc4b5a40f938802ae9dd7fc24e970f687)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x23b2caf725be89e09a872890b5de7b2aba5bda547f49f35ee96cf89fd47d7d34)
            mstore(mload(add(vk, 0xc0)), 0x168e361b7948e94999fabba9ecaaba463551d9b799602933afbe8fdf6b850bc5)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1c02f389b43ca077cfbe507f77b3c7e0941bb2f7285e5e616a54f7af77e9e6af)
            mstore(mload(add(vk, 0xe0)), 0x0c01bd99683038d6dd483e67b2a82a1c19272566e0defce8da5028cf04f500a5)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x27a8d593035e3d9de0914df0e8c3661452dbd3dba06f9515d7b4b68a38d8d3ad)
            mstore(mload(add(vk, 0x100)), 0x2b43d512e2ad08d5236e4de7a19e104753ea11eddacb9758acd88a94588c6fff)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x117a1523597b9776d26189bbdab9425e0c7b0381086462b5cef3b6bf322e46f2)
            mstore(mload(add(vk, 0x120)), 0x0bbd3631161e4eb6120541c51330c2d0e1beb2cb81de3da8e5221e084bb4ec36)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x01ccde843bd7d2362a573c2fbd54f69b1ba49bc0d14f26d47d8b1e7f14d6c99c)
            mstore(mload(add(vk, 0x140)), 0x1ec1ff5ebdc768342fa275a7b85da3fc7f2b9317490546366e5debeb676753e9)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x23784776a2332bfdfb62abd58b5894e198ccf96a1f8f6563436f1b77cc948df0)
            mstore(mload(add(vk, 0x160)), 0x085f3777c7090e40bf0bd03b4222c19c65f119beb203583f6e6f1cdb0c3daeec)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x03b2acc28909a2fc96efe2dab38fab92beebe432b556a0b4faef48bd464124fc)
            mstore(mload(add(vk, 0x180)), 0x2b93206466e8c80e5d07613c5cb50836f2dd9cf79214fddedcfe445a50b62bd0)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2b79f2f69ce0bd04c223895bb7f52f5cff29f1fec329f1979d17b3b95bcdfc03)
            mstore(mload(add(vk, 0x1a0)), 0x02c9eb65653554f41578f5c22c425ebb2c90ddf9c147c5fa8fcdcb34800ea9a8)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x011e58d5aee2c7568ddeb05ea0c90fe06c49e22b4047dca218f696c6dbdeadc4)
            mstore(mload(add(vk, 0x1c0)), 0x18a81a3da687d9a2945a4ec6341b3edf4d7d267983d0f29cc8979be1c86c83d9)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x02c732e776b0d0c1b8a80a7b8a6a08528ce1d2f6bfb9d7b3f32bca5b5a3e85a5)
            mstore(mload(add(vk, 0x1e0)), 0x2646ce4c08a7235c5b1a5c466ef13693022c55e9b445c582ccc041f3c8dca7f1)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x245b8f182cb3c6e0d080829983ef91ee7f0abe7665e6469fb2c1e4b1b94d5310)
            mstore(mload(add(vk, 0x200)), 0x0c4ebcac67da129af2c905d2edad5237cfcef2eaf5b83e74570f50398965128f)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0fbb25bb500a63bfab141e6b4cc3cb3f62c2f118847a3ebc0c0dfa3d6d5f9dbb)
            mstore(mload(add(vk, 0x220)), 0x070f34bbfafa5c46ec1fb34ec5f9b6ce0120c6aa545020331fb5083d9f5d73b7)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0cc6968902110f1f5ece183db4d171c578993a8f8d956f90d25ba8439abc3aef)
            mstore(mload(add(vk, 0x240)), 0x2229bc003f82b1884a7364e7cdad7c0d1a3c75b6fd7b67245e441ed51524a76a)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x14b46f5b1b5ace289de39a95790908e0498f37a677e6eedb0477568ef7e32aed)
            mstore(mload(add(vk, 0x260)), 0x2e8f4bd170dc4464c74f1f2866bccf4d3f3108501995fd95cc10232fa81fef21)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0073637c844a499577bd4be6ad579ab564bea32989a11bb080082a6590d9a65c)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 37) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

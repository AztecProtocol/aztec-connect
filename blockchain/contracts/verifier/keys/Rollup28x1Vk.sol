// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 414) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x20c3b1f6da75a02125fd172b2f89571ddf8a3bdbefff1624d5677eecdc7b83ee)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2e9046591f50cb3d830f378a7de9997952bf257d7cd6f8b9eff3257310c05cb6)
            mstore(mload(add(vk, 0xc0)), 0x0fdb81dff3306b2751f20e554cc3fe16508dad7e10abb2a4acf658c1c974562a)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1f798ebef49709fbe0cd9bd3c1e07221b3eac1ff4ef2d1142a79aa1eb2873e7c)
            mstore(mload(add(vk, 0xe0)), 0x198f888e8ab414636d44e07aade430e8e13e20f8f606c306fd85ae32005b917e)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1b8030742fed696820608f0692d92a59954c495c277676b6b586b01d321cb454)
            mstore(mload(add(vk, 0x100)), 0x24f170225fd7569dcec212ab3854a390dadd5908158dc604be644a99fbd020aa)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1922fdd43ceee396ecc853b5b9f75840c9423275ed10325e13507bd3a56ca8ad)
            mstore(mload(add(vk, 0x120)), 0x2ff0bd2b8a3695c8e5d6744934b63a4168f5b008f8f02542760377eb9ec091ea)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1c3c379ff4393bea64bbfc6bf7386145b249f387fdf2b2c01ecb0a86c12a0218)
            mstore(mload(add(vk, 0x140)), 0x025529f2478f861a8d44d4ac741bda329615a591dc5079ca25db3dff177ab2e1)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x215663e4138c943cc935a466ee2ad0fff68168d39865ca0a2681e00f8accef03)
            mstore(mload(add(vk, 0x160)), 0x06c098c8fc0f73360b0bcc0d67cdd633991145eeeb1c46d1c4ded94974df811c)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x18a07ca4716eed8aa4323851d69b290d1b590db232c11b3367d7d5c7ba891324)
            mstore(mload(add(vk, 0x180)), 0x0234bdb57026f0f29391273502a878e84566596c5c86dcfc48b96f13b192d0e4)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x011e56653f2c8c87648a8789a4bd89d87cd117d91943c6f5fef36b69b609bfd2)
            mstore(mload(add(vk, 0x1a0)), 0x0dbfa028b7725e3a265bc4e9b81a3673f3ad31b0e1d0d6ebb6b83933221efd46)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x10a9401ede7455864995e42092b64459f8afd0f0adde1713042370b7ce95d48c)
            mstore(mload(add(vk, 0x1c0)), 0x0bffa1c6d75dd184aa06eb363ebbc54da8bb9ba8d77530676accd99aac9bb0c7)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x126113745df8697ba05e5d0ccee227c75e1aab6d1cf559f2de5dc67d3a652ee3)
            mstore(mload(add(vk, 0x1e0)), 0x2c08ec515cef848d88ee08677817c978e841ccca2b146c8b8b612d10ec5478d6)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x050304aae6fbb062c2910fc1ca392f5573181304f28d65cebc69a7a98b35c0d3)
            mstore(mload(add(vk, 0x200)), 0x0ff29c6efc77157837cddd0413c6108068bfc492e5433ae4b057480601b31d3b)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x247a1ef053a643a70bdf0d968941ac0504ffec79599b9ace88c106dc5c27136e)
            mstore(mload(add(vk, 0x220)), 0x15fc7bf37a10ba59d33d29e7e64da19716d57e66a08fdb59daefcf006a744f51)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0538591473b3eec75ca4bdd61e6f2eb8c399f246da0ffaa59fbe8223b8717aa1)
            mstore(mload(add(vk, 0x240)), 0x1f2c4c03864e5e9757ba1a0d8cdd104f16a33d97bc6b738fc76cda336b3d02c2)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2dd7ff5f7c09c708cc6355172ddf0e5d9d8338eba59d98461e752c13b866e98b)
            mstore(mload(add(vk, 0x260)), 0x0ce0b16d4cf00309ac2df7cb9cc067876158f894fdd136e675da13b2bc72f2ee)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1b29c952a5f7d4564fae411e6cd3e54c738cea089808a68c9e072ce3a2735b8c)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 398) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

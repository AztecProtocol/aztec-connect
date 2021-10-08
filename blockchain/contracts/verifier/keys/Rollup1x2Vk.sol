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
            mstore(add(vk, 0x20), 54) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1494c983a4014af415408b84a73dd29a551dad2a46f5ff73e20e65bdda0415de)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x09f8e776e896591db3f175d3c70e3df79d8040f5f628c196653c9a069d5c1bf5)
            mstore(mload(add(vk, 0xc0)), 0x1e88c416481082631ca69190461e689da91a0fdb91069027790a42473fab853c)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x04b11f5528c899785e3f5042c624cb8e9d500636f9267699a3b58135865afb32)
            mstore(mload(add(vk, 0xe0)), 0x1ef5a0a59b3b6bafee6555671817a74b831e56ab6fe10affd486ce8b17d41585)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0c56d219136bb97fc64ac4d21a81f3375e68c30bc19100b6e91bbcbcb5a1c81a)
            mstore(mload(add(vk, 0x100)), 0x1f27d0f27790b9b54089b6d4cf6753665c8e4fcd7d5332ed68a11c24297aa8a5)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x012543acb47293aa56293e9795aad4f0723217954f05ec91b3024de0bc630351)
            mstore(mload(add(vk, 0x120)), 0x04072b0a6b300b05d31e16ecc4c4c5d24cc325d90728ed15305d1a804233f94f)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1b286071b0a083bdb26af1584fdf83c465745404ce1cf2b8b349154cc2e0580a)
            mstore(mload(add(vk, 0x140)), 0x24e87dc9bd6343226fe885af9f30da07c22d23c35a93dcd6cf3258e08c3fb435)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0ceed4102b3a4e272c30c9098ba676518ea4cef6c469a8c3dbaec2e0df17339b)
            mstore(mload(add(vk, 0x160)), 0x27fcd290a9064d2dd4bacd1e5f4bfe5303361f12fc5db255a5a348decf5a405e)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x10b0c0c35d7e7227402b20b3631e54ae7209b1e80c939b242407dbc9d8359d5f)
            mstore(mload(add(vk, 0x180)), 0x2f50fd42e3b7d84db82e7252791073d4622cd1d3993d657deacf0879edf7e8ab)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0d891e8d949a242b3430e33247bb95636bde08c062150f61408685e17ec61838)
            mstore(mload(add(vk, 0x1a0)), 0x0aad547972b3b99db5233ada23dfa01701d0d50bb2cd2d8919174e6e3551d5c3)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2fa67d69cb906af7ef46bafcde68f97a80f002bb52bf573341e577c55a428a36)
            mstore(mload(add(vk, 0x1c0)), 0x035bb3d3ea11cee216b5fbcb0654c7abdf976d53196bb24f6414b9ccce34b857)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1cd877aed87b33e713def94b9e913a7f60a07109d32c3aef18097bb802e6a6b7)
            mstore(mload(add(vk, 0x1e0)), 0x2956cd5126b44362be7d9d9bc63ac056d6da0f952aa17cfcf9c79929b95477a1)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x19fe15891be1421df2599a8b0bd3f0e0b852abc71fdc7b0ccecfe42a5b7f7198)
            mstore(mload(add(vk, 0x200)), 0x1071a8c625ed26c4e9f3b559d314e04f143d146fcb5484dcfb1b8a346758fcf0)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x12da71aa112ad82e5b0bb196f555df492171be424670eb9ffe3d69b5c6e3d54d)
            mstore(mload(add(vk, 0x220)), 0x1d0148032a643173acce91e4e1d65fc077e0e5ba906d3c4e78f29d0947e14002)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x01a929b46c92ec4d77a67e40dc0bbf9ae7a91021e4edd619b280dd872eb43140)
            mstore(mload(add(vk, 0x240)), 0x00313b1a850ae2f3e7697f625f7ae5cea2c86aec4833a22e6c3fd37bd3eb87f6)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1b0e7a48d19f1a700f8dcdd6b020f203b12538239d09f6184c41b52dadbfd546)
            mstore(mload(add(vk, 0x260)), 0x26e161b82fd7ebf027f67cc8b244d0e10e3e11b3a16492ec23a7ec1708a61bb0)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x058a758818fde0ebb9016d04aaaeb69cc6ae6fe385eb12237838dc71cd9c3f2d)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 38) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

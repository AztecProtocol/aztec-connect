// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 94) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x226ec6b9bc95e925ae48d0c692b1b7bfabadc9bd2cc3c1864bd1a28475b49423)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x115e7724178a98fcf60064adf109bf9c645494c4b243df1b679bbdb32b02e9dd)
            mstore(mload(add(vk, 0xc0)), 0x13f47eab409a952794d3efe20060a702bd0a4210f98a4a51280ef646333c2d35)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2557f44f3d23cc7142362179c9befa1a4b09389897369a6c602a6620f05b3fc9)
            mstore(mload(add(vk, 0xe0)), 0x2d82fd33e68bad6953e4e2c51bc9d61ee84cb4d4a869c26aef92be193b16ad52)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1bf05432f098b84e4bb71fe67a481e74ba66e54c10189ced21107a0fc1e2c3c1)
            mstore(mload(add(vk, 0x100)), 0x183be9314ff538c2c90879a5c7305ca63aa552fbf618845df0d24825d477b2f2)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2a05e68d52aa9deb8e7799028fa3d7fb6276e0ba4aa51616e1c481ff5c73ebc8)
            mstore(mload(add(vk, 0x120)), 0x111f4782da2a1db0b757606871b32bf6850540c9bbaf2671f359a3c5ec9640d1)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x00116d62830f6157f68b457a5a580686c4f2bdd0e9b6e2727d99998c576398b4)
            mstore(mload(add(vk, 0x140)), 0x0b82fa445810be3174b8ca385cd711aec91971122cae93328d796c46216f8e6c)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0a3796b295d679ac78737b448746431a9f35ba670350547b586b357bbaf020f4)
            mstore(mload(add(vk, 0x160)), 0x2ba1161f86495539a5997857434cb45aa3e0d30af8826f313264c9d60e84f089)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0f816efaab7d17ac4ee66693afefe0b88fe8fe5def009bdb7b7bb7a880ed031e)
            mstore(mload(add(vk, 0x180)), 0x188b7f3463f6f75da1e8d20b0df4da3e77091b99d7c000f486c234ab0b86c7f0)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0382cc742faaf68ff13441bc37f8c411d07a526ae78e5091f5d4e0e57c095869)
            mstore(mload(add(vk, 0x1a0)), 0x1f90135fbc7dba56d988d493e8da9a0c159f920fa71416d9e00a37bef0be1ec5)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2d953491529c09dc69b2ce0690a0b76b347155eae68ccff521c4f0c8b94fd554)
            mstore(mload(add(vk, 0x1c0)), 0x169c9d47942360c37541476362b6c7b2229153448a1ee55bbb8a7c695e86f102)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x113bc39763a905a0036bb36aae74fb0767f1097e7feffdd2b122de613ea497ee)
            mstore(mload(add(vk, 0x1e0)), 0x251db11a7df7ad537219cdb27166ffd67b0fe3b0a886112ad0cb45af6a372326)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1fb268c2fb531732955e42d1502c5a3cb214b3206cd794f3eb555001ad289c9e)
            mstore(mload(add(vk, 0x200)), 0x2244020295514e6c143a7387fb6a5fd945354f03bce566b03b356e4257186def)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1d964530cffa191d878af1e31750428c6681993e06e8f2826398361fa5acfdfe)
            mstore(mload(add(vk, 0x220)), 0x15ac421d0cfada2d6c82f12cdcbefad31ec376d50c2b33dab071578409f00eb1)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0c08522c483d0c52b78084e73557aadecc755ba1f0cf1778c56bf8f9d009d344)
            mstore(mload(add(vk, 0x240)), 0x2bc154be3ada143a418715a4988f6df290e14b4a0f376ff10fa2f0b1d82bf3db)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1609e170af6595bba0aa75017ddb4e4522675584182da9215ad31c4f3e2c3206)
            mstore(mload(add(vk, 0x260)), 0x06cbc242785f274eba103b1359f6dd4a3617316ac4332e882ad7dfea09cf5ff6)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1206eaf3a8bdca0a93c71c9360a64c6cb08bbe33f57307ce2964ba356b3bbbe2)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 61) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

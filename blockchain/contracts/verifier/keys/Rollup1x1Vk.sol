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
            mstore(add(vk, 0x20), 42) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1804131c3d59730a878c2c90bf7a8e92dcbc8818cad7fa05ce59c6e003622cbd)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x29633c3ccc2672f96b91f267038cc21954796db70a00be8fa2e1a7fd928897e6)
            mstore(mload(add(vk, 0xc0)), 0x23adc38a1ae3b72f247d19af6d25246eb318ec240e9758f3def26a22ce96f78c)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x029a3ac4859d4daefd31ace1e4d4e8be42bac8bec59072c7237981f6a51119ad)
            mstore(mload(add(vk, 0xe0)), 0x182c598275a8bef5cdfe13e33f6f78ee77ed1dd2dd922b891b75ff26fe534ad9)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1802d768f37d7433a3274c7bf3e0a5e3d444b270518d3657fc1797cd993561fd)
            mstore(mload(add(vk, 0x100)), 0x0c16e10a13db828f1a6137846d9420cc11bdcd19edff05f39b9e47b3bf953cc4)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x20bea7e7fe545095d527471ad4126b7e29825b9f793b7346e9f305af5da2eb23)
            mstore(mload(add(vk, 0x120)), 0x21a24f3a3e29898912ae459fa0ab70956ba72568f6342d253418e782b698a889)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x14ed25ebfac646df91a7680393ba7a8e676432cea41b0e7369bb8e015e482768)
            mstore(mload(add(vk, 0x140)), 0x15015be7c1b812fbc9ece949280a3ec00609a804dfc7daa900c521d8c064e741)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0255d44470e7e772c2c4040ef570209ab2146363892e29e33b4504e4d0efedec)
            mstore(mload(add(vk, 0x160)), 0x2aefe20fdb7b5707bdce750a898c22f98162781259a79af988a08dfc0a7bf460)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x15588c8c150fdc0a0b7f33f4f947e4a8bee341d818be831ef70f1de63781b0fd)
            mstore(mload(add(vk, 0x180)), 0x2358a82f2b4ac8dca370633aec9b9a197298cdd9cb3e17a621af87b32ee93757)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2cf113fadcd3e7e063e6578ec0f56d5c46eef945110fd8f2177c8b975fc4cf31)
            mstore(mload(add(vk, 0x1a0)), 0x2464fe0f03bc3bf549ea6ea21682df575c8eee941862d3d902f5bef0c6c5073d)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x16b24942e04cb035a4f3700678045982dfb410130368fc79640e3bf81f3d1695)
            mstore(mload(add(vk, 0x1c0)), 0x22636011e2ce575ead19c67228b4365423e88020d07fcedaa69831bcfa518546)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0dff1aad3f8761befdc296e8dd700858986ebf6a5672d03625ff285fd8dd5baf)
            mstore(mload(add(vk, 0x1e0)), 0x20735c1704fee325f652a4a61b3fe620130f9c868d6430f9ace2a782e4cd474e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x217a0dc7aa32d5ec9f686718931304a9673229626cbfa0d9e30501e546331f4b)
            mstore(mload(add(vk, 0x200)), 0x1b876e58c3e492d958a50dc55cd34dd803e2d65c20ceab7583bd03075f941271)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x064157f081aacc17e9f9302b0ac04d57b894d246c6bd9c1a35909f7aec32396e)
            mstore(mload(add(vk, 0x220)), 0x2b07921e484eb516fbcd9dbd7f240e7303b9dee2e0dc94af6e452b6e77043535)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0dd1e0de46643e1026db67650cd6da0f3f2da26de14b0f40524f148bfe5baa1e)
            mstore(mload(add(vk, 0x240)), 0x2b4255c35cd84d61f1d08d057f08960fa2fe9360926e2dd2a59e550b28528026)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0d926587501dc3da56736d6298f39216b1f32ae30245909f321205f936001605)
            mstore(mload(add(vk, 0x260)), 0x09add5431f947970c0f4e3d3caf27431f09469810218091b0d244d858d9a89b9)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x295e44c62bc6face1c3c7fde15e6af5fe7930ac6de83b9635ace5395c1c47c4e)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 26) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

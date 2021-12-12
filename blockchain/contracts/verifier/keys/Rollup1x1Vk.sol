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
            mstore(mload(add(vk, 0xa0)), 0x25390913c5974bef766a8a0a5af782fd039ea5a9d4aede2817f02e14ab4114fc)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x29c5965cb93f7aa8643c83a476e1749cdc4c85c341985dd0d54fcd5dc8398dd7)
            mstore(mload(add(vk, 0xc0)), 0x1ed06fb9a009077b7c15c493e8f9162358315fbe652eeec9e6988502a3b288bb)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1f0b1a5f5aaa31de8ae34f347dac987223c6a44864f661da2ff2af14b4a1633e)
            mstore(mload(add(vk, 0xe0)), 0x23afd4cdb91cad9f2e429746bcff16aab228215dfa9ccc5d88c50c0bed5b9cc2)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1ef69796c6c4fd141a2d530ee25cb1fe131f41077ec6f0fa0235f09db131faa5)
            mstore(mload(add(vk, 0x100)), 0x0553053cf7758173616ce52d05ec4066641460c1066b4c7e3672afe4fd4c46c8)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1e749f044086c2c3e7120c55ffb60f0a6fb5ad673d5eb6b7d73d4e76d26be615)
            mstore(mload(add(vk, 0x120)), 0x0556c56f8fe9d1ef2c2853af88e15d4953cda8df68e52cb9f2938ebf8bde2386)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2593139c74bf4bb4c619a4a33bd0bf08157b74e580402a2c6a1da77655e83f9c)
            mstore(mload(add(vk, 0x140)), 0x12cf6657075c75a14a946b9d425ccd820559880ae0206021bf4abb3f1f5e0a17)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0afd2353a51dbdf875b309a60abec2e7d2a9a12e51940c7183439a499a677cab)
            mstore(mload(add(vk, 0x160)), 0x16a4029e1e2e59bc439be2a4a4c6cd7dbc6eaded01ad77e927473da544334d4b)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1341ff4007a01fa22fee33bed0eb97fb9c0134c46af0beb0d346bcb64c995552)
            mstore(mload(add(vk, 0x180)), 0x0c49ae172cde337f14194fb4212e6323f3db82f072dc45d8a450f6daa7d3e28d)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2feeed427a0e59d56eac80d43d9301e991d452843830e72daf74d3d2fbe62896)
            mstore(mload(add(vk, 0x1a0)), 0x0c3aad92b1b550f3463bd61fbb53b170e29d11fcf3860d951b28cc8de2a35492)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2bad1fa40eea00506addb334f7f7e43878973bfdee9b2bf456728194b788560f)
            mstore(mload(add(vk, 0x1c0)), 0x0b93e156f18ebfb463fce04e6ba1453678ab69d9884f45c813fa22767795ef14)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x112fa28bc39356ab856101e2b0df0174431760ae68f1f70400988c9fbad95695)
            mstore(mload(add(vk, 0x1e0)), 0x2b3f5a828b5461b20bca52d88120c7ea369b6668ff3e1147f7fd1a757c023acb)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1fa613eadf21d222bf645feaf9725ddf7b3d8cfc159d93b34eab566ec434ee75)
            mstore(mload(add(vk, 0x200)), 0x09efeb79dc4e5bef5049cd5277ba72c70c3c031dc3be10b9e14d7c7cbe892c09)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x25f642d818e63e3995b648fafc0bb3dd2262dffa2df84d812a19f961cfc32499)
            mstore(mload(add(vk, 0x220)), 0x253bf04a86bdd932ad28a4bfcd24c12a6e323e062fb2da87fcb27cc5f4749d6e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x041257f354014c3bce8c9ed77cc59ed5dc3255968c1e3429f8df3739830fb0d3)
            mstore(mload(add(vk, 0x240)), 0x07a6273dc71e924da1df2ddc8ad9d2c4443e6ad2993577d5c80e75be552054dc)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2a49f5d39753cd4802085148daf223255aadfe1bd2a49e066068e1f8821222bc)
            mstore(mload(add(vk, 0x260)), 0x13d877bb601c49c90ed7307af3f44c2efc044d9646e3693445dbfc64ab2d592b)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x06626487231796f1a9461d540c3fcb0bd58cf426c05e440af81392f15e180ee6)
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

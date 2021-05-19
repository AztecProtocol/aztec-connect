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
            mstore(mload(add(vk, 0xa0)), 0x23dad1e5f7d32979a47c8fd12eba90a59cdbe4d77557072637a041ae45ef2ca8)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1ade46b2e1912f1fc0af5461b61c516332b08954fd3335acbe3e409a6ffc13db)
            mstore(mload(add(vk, 0xc0)), 0x0fb8533942361a41f5b7ec69ed9882f0fb9bb69b11180c8c7d910796b75835eb)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x023ccac4505847325839286a22448889ef50afda3d43b3572c0198d8ed85cfaa)
            mstore(mload(add(vk, 0xe0)), 0x27728ef9feae7785f6db4dea09aad98689671f6541d5f1ba29300865756c0694)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0b568f0df8e316484b67655b65baa7c08332abed12d6f740693d6bbea57c6515)
            mstore(mload(add(vk, 0x100)), 0x22ee1ac50923d59faeeb4a9b164e39641a2b521dd3065d1d6d9547db3ff09bec)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2efc9d661f739a2c906fb25337435d1842efb4b8273ddee49e7feb1a2e053af1)
            mstore(mload(add(vk, 0x120)), 0x078dff8cf70cae1523ff8fe0acc49171d9f63603463aecacec7e483614261dad)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x274ec165893a1c57be475719594710d9b32ec9314770cc82945b1bd315be518a)
            mstore(mload(add(vk, 0x140)), 0x2e67df3b114788c46588837992ee1e58cd6852d8b59c7176d9334763b038fe44)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x04a254d9a523e29971ee75ce2e5892f56de013f9d675a14dacab4f30a89ad8f5)
            mstore(mload(add(vk, 0x160)), 0x11777fc147bbc86e322612907c59e64b41419b17865fd8092c22e9564e3066fd)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0b283a1c47752a2451ae71acfa7b074df8f3bd2cf382d3a534eb2cb614ddd284)
            mstore(mload(add(vk, 0x180)), 0x1d803118553bee0810b5e77ee0c74a9ebff5894789661ae62293f9ccb953260d)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0731ac3816e65ba5a0aa7a80322f5dd939b4b273d2e364c53427e0e0794e5473)
            mstore(mload(add(vk, 0x1a0)), 0x067fc7767b3443973c114f1b93348e13f7a43cc457228c6d11ba0177c79e4950)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x29f73516ab70d665a67748634a17956cdc7e877bb303d0f215bede8c376d825c)
            mstore(mload(add(vk, 0x1c0)), 0x30642d7015dffb61e7977d03595cdd701d8dc6e3d22ee70ce8a58e9fe1032541)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2743051589db3d366861c3c480405f39afb8af39a60d9aaea174852eb338a15a)
            mstore(mload(add(vk, 0x1e0)), 0x06b92399a0c754dfc98bd6c3eb651193ac2d6b93314f67c6d78bcb8aaf60c695)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x12b26c65cfca03137e7b68eae60fb9b8a195f772767e35b72b9e880482af3b3f)
            mstore(mload(add(vk, 0x200)), 0x0e3200c3e10568d5ace5e5fe894af860e8b99d44a606d1f8044b3121670fe7ee)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2cc03cfe3bea96d297365e43b1a70cb7a5bab0ccccfc197062b4eff18ada5723)
            mstore(mload(add(vk, 0x220)), 0x3056c2854cb5a1f7c46cdb0f6d7c3a93db5091ce0f20db7923fedaffa3e56ff5)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x3013e2b69e913bf93aa18ca5d8b8eb13cf49f1eaeba78dc50b6717640afdec57)
            mstore(mload(add(vk, 0x240)), 0x0262f56f3e32434b587aad66664967cebb482a742e90e685a4b4edbcdd9baac3)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x26dd280b9fac84b1b6dfae84ffddba85f7390baa56de13e78455c16e3b41b12d)
            mstore(mload(add(vk, 0x260)), 0x28b286b0818a376c32d7269cbd6b9bf0aa0518d6adc5059abe2463468675d480)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x07f25355fc3eee9403c1d79b3dd36682f2392f1910f1d3ab293d8ec80ffb31d0)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 25) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

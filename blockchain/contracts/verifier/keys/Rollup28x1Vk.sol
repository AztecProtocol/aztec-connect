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
            mstore(mload(add(vk, 0xa0)), 0x131a4ab77d5ef901c051db551b52fa4db31627c146641bc8146f5d8a37d51896)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2175f0a0d1be6f7f4c6a67bfbec75e71c70b13038344cf38c7a482b30fad8b95)
            mstore(mload(add(vk, 0xc0)), 0x009e09a3e58907a9fde56c9ca7986692f8253e217225bff8accd7d7ff19230cc)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1c1d323236a620d8cab05d51afc2fd1effab51bc5b201cdeefcc30b833c67431)
            mstore(mload(add(vk, 0xe0)), 0x0716d0c8ecd5f4de245505802ffc9f3b600b4f363aaeb5f1e6bae609c34e9ec0)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x180b0f77e48ddb0148866b58ca0729d088cadaa81cb791f476b202851ada0dd6)
            mstore(mload(add(vk, 0x100)), 0x17f67f82a53f726931c94d68e1b1c85255a6c9fae9b4a5c3400b35a4f91bacc1)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0588ed9770ebbdba2f33304a04e80eb9606935d2a6d270019052bc18b46ded7d)
            mstore(mload(add(vk, 0x120)), 0x020c2dc4dc94d2a51cdf59997b0f0a2e49239325033162de576f33afe6234015)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2cf542e642ef2b92c7ba41c2ade86510826c70a59b5556b8423563252e517bf5)
            mstore(mload(add(vk, 0x140)), 0x14621110b991356af79ae17112ea874144c39c520d8fa258ebc57246cdfbea75)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0ac77e8fb752574a51837c968760ee3c3e1fd74094a1ecf36d2531114435b3cc)
            mstore(mload(add(vk, 0x160)), 0x26a5c56556c6a47b88d02cc6e62dc95f5b02b642101432b35089b808d55939f2)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2a11834735d79cfefdccc00c5e65a4b2885e411d9eaaf331b533fd9464fbe102)
            mstore(mload(add(vk, 0x180)), 0x2619d4bcb4171a3a0cd4f369ff676178c269a58620ecbe6a3c3fcfc546aec396)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1f8db7de67d896a210afaa1e3708ae6a78c4e938a8c18d9107956051ec72b071)
            mstore(mload(add(vk, 0x1a0)), 0x0c45250be3d1aef45f00bd2d6a7089212a937bebd4a15e95225440d0c6e4c76f)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x294d8b005b9e0bff4da7e2a6bc7c9a888cdffa69b05f783ea1c3604429fea63a)
            mstore(mload(add(vk, 0x1c0)), 0x17ca617c07a352cc3ffed601db32f9865754eca3000a8d85c5dcec9c2de64a15)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x106900630a849ed16000076caab5eea0d263fdf2bf255d9fda10917830596b0c)
            mstore(mload(add(vk, 0x1e0)), 0x01902b1a4652cb8eeaf73c03be6dd9cc46537a64f691358f31598ea108a13b37)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x13484549915a2a4bf652cc3200039c60e5d4e3097632590ac89ade0957f4e474)
            mstore(mload(add(vk, 0x200)), 0x0184cf7430ffe7664cf2b1da1ce631a39e9b0c9ad54964352384a6475c2f29a2)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1dab05fead8b573e4395eb9ecf4483d79648e35344a09a7b4a09f439d0b04643)
            mstore(mload(add(vk, 0x220)), 0x1ced7c80e79bd9e5604724ee9ebe41a61d3633e69368abbb48ebd07e79cdde5e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x226faf947eafb1dfbb3c2984736109572ac942c2daad5019ec31c56e2b8cd418)
            mstore(mload(add(vk, 0x240)), 0x0095d13ad62ec509fdda38d5933c63db9050d797415ad584273339840385e230)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1e3e80bdc74385acfb2f527a6440bd8ed129db290287bf730fc859594e300d88)
            mstore(mload(add(vk, 0x260)), 0x166b4a087290dbc7765c0c334769ce1b15bc87000d5d78f5d6e8bffa7d7170a0)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x282be34de658dd836ad0fe796d1c8de49bf1f431de00c122e3d5c8e036e63282)
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

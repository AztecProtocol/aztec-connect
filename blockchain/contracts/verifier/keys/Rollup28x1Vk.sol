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
            mstore(mload(add(vk, 0xa0)), 0x2196fca99cdf384fd4d16c84f7c8f203d2d83b53270d0ca999ddc0261d7b911c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2fdf6b9cb188a0fb39630fdd70eee6ab565e1590a3fbd99ff7084aec7e023c60)
            mstore(mload(add(vk, 0xc0)), 0x10daf1db0872adaf0f8b6a7ca3a4323db0e6032436f60b4d8107a333343935db)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x07cd7fd5d20f1f145bac6caf6dfeecdf94c448d4f737d2e887c1d05c95a4eea0)
            mstore(mload(add(vk, 0xe0)), 0x0716d0c8ecd5f4de245505802ffc9f3b600b4f363aaeb5f1e6bae609c34e9ec0)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x180b0f77e48ddb0148866b58ca0729d088cadaa81cb791f476b202851ada0dd6)
            mstore(mload(add(vk, 0x100)), 0x17f67f82a53f726931c94d68e1b1c85255a6c9fae9b4a5c3400b35a4f91bacc1)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0588ed9770ebbdba2f33304a04e80eb9606935d2a6d270019052bc18b46ded7d)
            mstore(mload(add(vk, 0x120)), 0x020c2dc4dc94d2a51cdf59997b0f0a2e49239325033162de576f33afe6234015)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2cf542e642ef2b92c7ba41c2ade86510826c70a59b5556b8423563252e517bf5)
            mstore(mload(add(vk, 0x140)), 0x14621110b991356af79ae17112ea874144c39c520d8fa258ebc57246cdfbea75)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0ac77e8fb752574a51837c968760ee3c3e1fd74094a1ecf36d2531114435b3cc)
            mstore(mload(add(vk, 0x160)), 0x1fa9aa774c5bbf552f5fb24a9b66f90561a50d5e9c8a230b47485eedf66997c8)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0baa4ef83dfbfbad77f2deea7b970f7c26945d52a569622bf9ed583f1b003b3b)
            mstore(mload(add(vk, 0x180)), 0x2619d4bcb4171a3a0cd4f369ff676178c269a58620ecbe6a3c3fcfc546aec396)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1f8db7de67d896a210afaa1e3708ae6a78c4e938a8c18d9107956051ec72b071)
            mstore(mload(add(vk, 0x1a0)), 0x0c45250be3d1aef45f00bd2d6a7089212a937bebd4a15e95225440d0c6e4c76f)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x294d8b005b9e0bff4da7e2a6bc7c9a888cdffa69b05f783ea1c3604429fea63a)
            mstore(mload(add(vk, 0x1c0)), 0x17ca617c07a352cc3ffed601db32f9865754eca3000a8d85c5dcec9c2de64a15)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x106900630a849ed16000076caab5eea0d263fdf2bf255d9fda10917830596b0c)
            mstore(mload(add(vk, 0x1e0)), 0x01902b1a4652cb8eeaf73c03be6dd9cc46537a64f691358f31598ea108a13b37)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x13484549915a2a4bf652cc3200039c60e5d4e3097632590ac89ade0957f4e474)
            mstore(mload(add(vk, 0x200)), 0x2964ce100082204c2de4d88fe9385ed8aeb29c5925bfdda01bcfe751c28d809f)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1524cdae86827dca0474e731c93cc09c63e4ca57135038765994898d8ee5e82a)
            mstore(mload(add(vk, 0x220)), 0x00c32810272471549f6a543ec669ed4480f763fdd3febf0101de32207ca8f004)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x05119b3735e392d40ec63b0ea3c72fa6191193c2a2c547ec096374d54c0e8700)
            mstore(mload(add(vk, 0x240)), 0x256f35341ebe2a24762259d96797df05b0d884de43ed0f4cc3a182ffc697ffd2)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x13f43715bba65b01a130cd9885a556e1e39b7dce4aba4d74cbe44bff706b780e)
            mstore(mload(add(vk, 0x260)), 0x1d8bf7ba423e0bc6b0e7adbc502115cb8cd67c890cdaf1858211bf65874411a4)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2e0e1242399d885a8a33418d348d8099fdfc7a70e9df05832059ac6ab348f5a2)
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

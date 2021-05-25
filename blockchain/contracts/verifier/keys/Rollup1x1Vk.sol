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
            mstore(mload(add(vk, 0xa0)), 0x1f2ac4d179286e11ea27474eb42a59e783378ef2d4b3dcaf53bcc4bfd5766cdf)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x037b973ea64359336003789dd5c14e0d08427601633f7a60915c233e2416793b)
            mstore(mload(add(vk, 0xc0)), 0x09a89b78e80f9a471318ca402938418bb3df1bf743b37237593e5d61210a36b4)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2b7e8fd3a325fa5319243146c0264e5447f55f9bbed7638db81260e2953c055c)
            mstore(mload(add(vk, 0xe0)), 0x08b939500bec7b7468ba394ce9630842c3847a45f3771440c958315e426124b0)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2fc02df0bface1f5d03869b3e2c354c2504238dd9474a367dcb4e3d9da568ebb)
            mstore(mload(add(vk, 0x100)), 0x2c3ad8425d75ac138dba56485d90edcc021f60327be3498b4e3fe27be3d56295)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x217fa454c2018d20ac6d691580f40bba410b37bbd05af596b7de276b4fb1f6ee)
            mstore(mload(add(vk, 0x120)), 0x15a1de41f51208defd88775e97fef82bf3ab02d8668b47db61dfeb47cd4f245b)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x12f7d8bb05da8297beadd0d252e1ad442ffa1e417a7409cb8f5fdd9aa7f8c0f6)
            mstore(mload(add(vk, 0x140)), 0x1ab0878c1bdb3f32a0852d57d8c4a34596fd3cd05d7c993cb13ea693e8811bbf)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1288c1f417fb0b2824e6cfbf2ef2f0b7779b5021c31bc7fcd6ab2548098e3120)
            mstore(mload(add(vk, 0x160)), 0x061b6360be0227a86a035b045aef240eb58589053fce87c01c720bda452f43d1)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x01156ab445d61985688f31ec54c6cd62d316d0c87cade32706fd236c2e93d96c)
            mstore(mload(add(vk, 0x180)), 0x0b0f5891e864b4017a747aa299632bfe31a889aad3f3de6a01852b1ce243001e)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0c9fcc80878d243d6188504c7887f5f1fa75ab2bf26ffccf756eee03c8a84c76)
            mstore(mload(add(vk, 0x1a0)), 0x2f9db190db59e2a2d54873e289c85cbbb7ae92c313ec601b431f497e98b0a421)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x13e353dc36b2271889f3914bd574bbf7543591e0ee3e0536602f34b2283815b0)
            mstore(mload(add(vk, 0x1c0)), 0x2abffcb12d5d0076a25e93b0c7fc92189796618f174bb7d1af5fc920676117be)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x068a7d9bcb8ad26f29607644a4e06c1bc4be3ce7febd65bde61879a24e570115)
            mstore(mload(add(vk, 0x1e0)), 0x20735c1704fee325f652a4a61b3fe620130f9c868d6430f9ace2a782e4cd474e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x217a0dc7aa32d5ec9f686718931304a9673229626cbfa0d9e30501e546331f4b)
            mstore(mload(add(vk, 0x200)), 0x20cff9441d3a303e85c353ce25709bef99d5a07dec6e6d76c9e97cb68e3fd311)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1d93dc5472d57a5863b6dc93891d875ade34abf17a06154b6793c187111fc9a3)
            mstore(mload(add(vk, 0x220)), 0x1c5a9c2747d0b4788343819582cd7d76a577a46b718315fd8361ee86845384b3)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x069b936b21b217b81107423f7eb9772a0295009e1ca7b449febdf11bd967b391)
            mstore(mload(add(vk, 0x240)), 0x162904b9f7b4cc5fb50b7440e1e885c5bf10646a1701f2b7286bcd237ba52c64)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0f281022f4802d347c838ba2390a5ed9430d596c8a3dc831f50ecf0bb872c974)
            mstore(mload(add(vk, 0x260)), 0x1ac525fe26d3a6aebce5d7e0e09643a8193eff2bd2f6d35262460233353cbaad)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x16eb8c3d631fd40449c8ae2e025a04660b2548b9783805868d74b7ef6e1f7d12)
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

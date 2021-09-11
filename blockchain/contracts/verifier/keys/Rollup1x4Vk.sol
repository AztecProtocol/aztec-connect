// Verification Key Hash: f14ba967f7210eea3ae7e5f164388a27ca9837295a59b89e668d7658fe39958a
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
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x296c014b7603e5cf89f79a36fcef159891b5e4b06cb654aea9f9a7a58dba558e)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2f069fd3db0e07277c8351510224c527a65ca11ab9d426d9e24c903917fc55f1)
            mstore(mload(add(vk, 0xc0)), 0x1a9ed9e2317642ccdccd35f4726ba863153bf5936d0371e16412e3d68a1c05d5)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x11d5c2bfa98ae94a1c01084c738e81e4c3a211abb9adc8b1a9891a4efd35301b)
            mstore(mload(add(vk, 0xe0)), 0x0c53103acf93b8b54d7bee9ad0a1538add0ea9f0f83c613c87cbdd57bee37ada)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x17327f74e616e2b95ef4d1d389680b1e54f97a02ff2dfe984ba5972a38bd22ef)
            mstore(mload(add(vk, 0x100)), 0x1dcc0d5a09c2e68bcb127b2a899df4cc3d5fcaf15e0d4e6733cb30c9664a1a85)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x10655ce85618ff8e8735a5a0ef48f070187f98ceb6ede54b58030feee0355b45)
            mstore(mload(add(vk, 0x120)), 0x14172fa4d057fe133f95b2eb6eaee8ceb817b47c07617e2666e749c3ec092fc5)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1facbeb638ecc41bc0a6822d6c391853e64931be8006e96db287b7d2244cbed5)
            mstore(mload(add(vk, 0x140)), 0x18022a4741cf7ce24336d8aacdaddd68e5a868d63c48e5570cb948018d0f57f3)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x02ae9c0f4c133e022390de5736ce9bbe4924463220f24130576d43d75495ef74)
            mstore(mload(add(vk, 0x160)), 0x0859912bd6abee8320ca6d200e536b9516dae2ab32c8251eef21a3fe8e78c32f)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x18b4579d295b2de7a2ce178ca1f5c8fe7e26e52d5aa9a3788f56ef1bf0a0461a)
            mstore(mload(add(vk, 0x180)), 0x2ecd62fd4665c7c0ce1d0a2d5fc5a705840407383d4a7ffa66490e5bb8577b41)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x16f57e510f7172ac365c52d81623bcc48aee086921b224f6fe90eb8f3ca3d720)
            mstore(mload(add(vk, 0x1a0)), 0x097d9fab60e876f6f5316fa826d3a8dac981b5958e93d5dd26e2ad132e8ca7b4)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2b4761f9fa24cc899427b46b82ee6b266bd1c2756ce8e1d49d6e6a5090ef0666)
            mstore(mload(add(vk, 0x1c0)), 0x1580b4ff8d128525ef04db3d8fda4286f53ae894f400177e05e0235246ff6eb3)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x10627ba43dc1c5a4c2059723269bf70e36b979b4f33630979bb83834b1d1d586)
            mstore(mload(add(vk, 0x1e0)), 0x0f8fe400ac2ffcebac26e193b21e828f8114a64eca7325fcd5a087575ea03bc8)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1f25126ee050d79ed2d73428abcfbadb4763eb79be0de24df0089728b5e0e804)
            mstore(mload(add(vk, 0x200)), 0x05a732073b2b26955a4ad77b306343e88456223d384f00a070810c48e95ec40b)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2630c8d6f49d464e542cb850d995cfa79851f257dc1fbbb90d242615516394c2)
            mstore(mload(add(vk, 0x220)), 0x270196fa8601bfedc71336315ec0ee4155117d7148f91c4c4d2eb7f3e654726b)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x00cdba5aedd26c55e2249561ae5f6ceaf0dff625d661a3f23c62d43b54155129)
            mstore(mload(add(vk, 0x240)), 0x2865026aae290f1448f97d4161d22f4182ecc2a47d5ce5b6bf5f0c8b59af755e)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x28304867c340e0f11ff39296d715154509f66c5842a4ae6cd85598f34c382d56)
            mstore(mload(add(vk, 0x260)), 0x0cf984e0d46aaa99553bad155d67968f92cb697945617e87e384e9ef60c04ae6)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1358077cd3c8ceb1317102135cd29a9b1e541613fa7c2eef6c46013a89c23488)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

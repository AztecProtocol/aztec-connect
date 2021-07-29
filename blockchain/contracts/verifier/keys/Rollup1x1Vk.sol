// Verification Key Hash: bb8aee4fa3313ea3213f636fff3ad731699a11b5e68c7fc6e367ca95689e6843
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
            mstore(mload(add(vk, 0xa0)), 0x2652fddd868c42f496802e428d81949163d5062ff03d9ee59ea7a7770e8d9151)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1e2c0e218f9c85b6eb83b12fbe3678b259259ff39e1c12fadec06f9a2d425448)
            mstore(mload(add(vk, 0xc0)), 0x04b9ebdbd1ff0da3c6034864a2e46808158a5e791ec6c885a8bc0d7d4200fe68)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1737ef6587d2c15e4d7bb812c7a8e959107d9623e7bb028b15d3c6503741d358)
            mstore(mload(add(vk, 0xe0)), 0x2225b702b98882d101a40858af97221b54bf3391321385eac94bbb08d39237c3)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1da58689dc82262a6078a028cc7be0f07357c0356d2dccd6a7588425d6bb0907)
            mstore(mload(add(vk, 0x100)), 0x08b8213ff1684bf983da3e5c5dafdc407bb581cc3ff0fb7d14136a2bb5ee125e)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x11518cc77a4501f66c860af92a813d28b5ecc1bb93275b90981a395d4c6db384)
            mstore(mload(add(vk, 0x120)), 0x16e5421347d411f1f819f20dfa1d932e1c55148cc17b71df0c8f8cd7231f9bd2)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x20b2b8219a90688fd277e3e1ae433352fb8cf318c969c720d1a6e2a0c55c1af6)
            mstore(mload(add(vk, 0x140)), 0x0af6402cb14d767f1b4acc9bc8ed507a349f17b31dadd443ac067aea9f0e330c)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0b5f997d013d384161e80411cff62bc1f3c1bcf46f9cca1fcc9aa0c266cfbd12)
            mstore(mload(add(vk, 0x160)), 0x2cd1f7709e34dfde417e161a0c333a3b29a15bbd3ca5e1ba1c5f2af454f1a254)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0ddc8e6e728936e1a9fecf50b0e186f259d743b21be61b5d08008f390ffeb381)
            mstore(mload(add(vk, 0x180)), 0x1f31af5b01a8e57f0ca0a64e49416e55f42be9f984d8d4069c6be9d0c68ec0ef)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x130c19c4c4e300ca3419976ffb0442279ab42eec0604e829b4537cd853fcdc75)
            mstore(mload(add(vk, 0x1a0)), 0x29e84b086877dc7b4b1ebce2bcb16597fab30e2b27860f07546ca4bcd9b34070)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1398015930afae08767f1851ae507cba8b83eac8c9e8dc50a2ac423982255d4b)
            mstore(mload(add(vk, 0x1c0)), 0x265b63891b2a0a1cf2addaf3452a865fb1593cc7a3b36968a20209a5f5433bc5)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x03f8f8b0dd2e02e941f08b7b34cbe8077f1399e9dc32ea477ae85344569dd83f)
            mstore(mload(add(vk, 0x1e0)), 0x02411d4f901abb5848849e5af6d2e78b5a607222916b8b03435a794769cf9f81)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x09417a83b0769b36fc9b462f128adab91f0fdbca99f9c183210c4e664d95496c)
            mstore(mload(add(vk, 0x200)), 0x0405e6a7d9bccb857b8f113041d40f01eb15c70b2d7950efe49863e5b10f8f77)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2c786c5cebac6e241f366d74e61725d1dfb6cad6cde85ceb4469f1947fab84ce)
            mstore(mload(add(vk, 0x220)), 0x12f9fd857a80aa8c5e9e2d2275e0f7d35c5baef51c9660c4f33982e8ff897af8)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0c52e199e8512fda1879c303017f2e4f74e6c5bd5f1165251bdda8ac018fd225)
            mstore(mload(add(vk, 0x240)), 0x2b2a1746f54d8b402b3f145b26bc34e9fdf96ded96029673db39968e56b245ae)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0bde8c3421882ea612b793c952af9816bf349ec9c70ff5dc6f4840be38397d52)
            mstore(mload(add(vk, 0x260)), 0x18b62902ff8a7656279979b35b852170ed02d264aa82b6eede3a97a759db209a)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x16dd6268fb7e489db2a46239331dfd255eb6125040290b6c151e8545d9b016de)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 37) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

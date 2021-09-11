// Verification Key Hash: 6d67d06be210964f91b1ce9b20619e0fa618f08a61a3468d1f867cce5ca1cb92
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x4Vk {
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
            mstore(mload(add(vk, 0xa0)), 0x23f6e62fbfbcd94c534aa4ba67c124143e43159583b850e760e8824ae3b7d091)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x294b7d6dbcac55e4d9b4ed5b3abb18142a960190dbb31e3f64ae2b1f8e53718b)
            mstore(mload(add(vk, 0xc0)), 0x1f13dacac60b33e4b9066f83eb6646f63f42b660885a07379398509af3f68668)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x09464fbe420658808ad31da63bbaf004e68c0ec23f629283c8d8dd4fb5bb7c68)
            mstore(mload(add(vk, 0xe0)), 0x2003ea490c5060cceb68ebe3604566b21e5f8eb54e17b29b35a8ebc5736fa74c)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x274c1daa52252a20c47b402981702640cb3a3554995869b82374550162de6669)
            mstore(mload(add(vk, 0x100)), 0x0d9c6322eadfb7e8e5de9e1d46caa2a29ad9b06b6e55f1ed003f38b48d0e4aad)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1c75a3602b0000bb217c6df554d8bf52fd8c505f5e04adb65db3c16ae9771ecd)
            mstore(mload(add(vk, 0x120)), 0x1f0dd0b2393804d7db89fb7cc86e58fd4956866136a6d84d2e530cc98c10778d)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1850b83c62a9c83dfa23a9b24cae593dd8d9176916b59b635e140109bbb50037)
            mstore(mload(add(vk, 0x140)), 0x03479a116ef5c87d0f2fdeed2341c920cb16af8bf9afa2a46224192a4e9b2caa)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1ee03db9b0ff6d7df8369f58a41dbbd98579c1c851d11ae07419d419001e5fe8)
            mstore(mload(add(vk, 0x160)), 0x0775af16711530981eb7e1c8225bd12bd906f4cb443d70a609a55bd6be21f7fe)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1fb206b6deaebfd339cbb3a264bea37d7078dec01954935c8b28aa5c1cc0a252)
            mstore(mload(add(vk, 0x180)), 0x13398cb42cbb9c45c0466b01541624ad8ec2a72386614e9c24f2287fce282684)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x09ec6dfc89ac4beda8c3b6d5b4131f8097c725e476caa547be7c5802fc9659d0)
            mstore(mload(add(vk, 0x1a0)), 0x07d6126debb7b8fb42309c9de416059415d647264ddded076ef39db4fb758a23)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0e910b440a2b2026ebb0973a7def711c5a1bd2369db23ad00105e211028cdc49)
            mstore(mload(add(vk, 0x1c0)), 0x1a040f06be313a71d5652f0ceb6cfd0dc07d67cedcb4f2c0f058af904efcc783)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1f0628b3363664d2c7bf5e71d49926be22211d91d4b0c39dc5902e7ceb634816)
            mstore(mload(add(vk, 0x1e0)), 0x1358e6b59d5adb0f8eaee448cb6be7b33df2eca06755871046b4b480b2e1b707)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0d4f92769663851fc9ecc6d10d7383043c8170124a98eb1134b848d652a6d50a)
            mstore(mload(add(vk, 0x200)), 0x1979d0c43de71228c1a887191116c47d4bf36d41fc3a0f9c55dee0e8c2c53d27)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0a2e5ce376b9b7dc322c28d22fee86151b9bc489fc3f3e436668e3d13bdfc091)
            mstore(mload(add(vk, 0x220)), 0x1284f39741755243959b794887018e6015f62e5e78ce913c635a4a33dc9cbc84)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x137c33bd6aa812cdf026fcb1ada8aac65e71d8720b66c54d5fcb33adb8ea2d1a)
            mstore(mload(add(vk, 0x240)), 0x0e993f86ad6ffbcf6674bff919eb35015c7645d926b4a855d0ae871745641a50)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x05b57ad3e943d0be0860c45914106e8b2b66d4763a5bdce6a127c913ff994856)
            mstore(mload(add(vk, 0x260)), 0x26acda84a91079b11f227d11476e403293d60b74b2ffc676d1f4ff923216ff78)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x00abbca27e831da79da6ba6b8f8a38de78f6241ea2dbf579ae65ee92c0fef511)
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

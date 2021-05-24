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
            mstore(mload(add(vk, 0xa0)), 0x00ce72266e3e19e2bfc4bc64b44fd86a05734219cc5e940e871d4cd17f36aec1)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x27908460de6ebd6689773b2e7d85af01553951de01c9ab44316868add9e06695)
            mstore(mload(add(vk, 0xc0)), 0x2d400545b5914e6c0ffc2ef46ff6b5d02a2e478b495a61c2ffe74e6c93903e82)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0ac24bcb691872dfbd4ac2b92ab35b53e5e47c72ccac8f7edf680ea1c2f3a40d)
            mstore(mload(add(vk, 0xe0)), 0x200d21ba8c7072cc0ff009fd98dac791e9d288f658490803d165829a6433d061)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0a588f35ee9ec716bb608c010a1df9c8a9b06f81e9dac5967a7335833ab9af24)
            mstore(mload(add(vk, 0x100)), 0x2591c45de45083371d25f90d7dd42af6d308c6fdfa15230526ffe6423c35fbc9)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x13c3fb519650f0e15c56471e869a4b1beeb2ab770ba32ff3016c7e964de091c8)
            mstore(mload(add(vk, 0x120)), 0x079427b5e53a559939e01303f93c145891fc20cc9d5125ffa1e5e80c60963d18)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1fc9baee6c1fa21066fa972fe27c1c421cda027ab5b0ab76626146d2155a71d2)
            mstore(mload(add(vk, 0x140)), 0x0394052943986db9fa8f2c85c8322913ace11aa78b472a4c5a9ea066024c6ac3)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1eb6e29c4aa13242dd08478d6cd36653c1ea9ff0c7a4d3d4ac9711c154d2605b)
            mstore(mload(add(vk, 0x160)), 0x2f1f5824bf05552c4fabcc0875ccc95b471d001c517026d7bb4a00bbdc35c030)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x25a692be78800ea25bd1834bf9c0af876edee6af5881a3f4507402f32c1ad1b6)
            mstore(mload(add(vk, 0x180)), 0x056169454b46c1530fd29837e9722af69142892a26cbf56bf7dcf08101cc9bd0)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x08bf616595eb02087eaca8b0c9b6fe8b94bbbf327696b3a7612a2217b86e6831)
            mstore(mload(add(vk, 0x1a0)), 0x1384edc76de4c37d0b615ab1d4775980aa1a93e15ed656c7f1a94d71b4960764)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0e37e60a653fe9f281cd70a54c3b160b2d4ce3cd3e4bfb50a8190128d8ec806d)
            mstore(mload(add(vk, 0x1c0)), 0x2fb5be4a9438f507f49aa0c8294f4819d63b3b810b6dd17c3ba4b49f6f5a61c3)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x21b7b0cf1a3f2c12523adabbeab3c8a37e592cd329fb39bf458a3e9e7e83c45c)
            mstore(mload(add(vk, 0x1e0)), 0x097822f42295c7e0e2632d48d54c5449ff42ea80f4c5306a122af66e569526e0)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0a9b72570b641cbbfa25de76f1f47724e07d61e02e125c4007368b08f5cbb2af)
            mstore(mload(add(vk, 0x200)), 0x0a9eaa6817bf193edd4391d37ba9217f32d82c571e9e3167ba02df057c16d527)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x21914ffabe71722dc041b74a0cf88e9e52b7c0b7d7998ecb73190fb9629aaa88)
            mstore(mload(add(vk, 0x220)), 0x0bedb9d07e7e387dd12ef4a1aedd6a43b6347f7464375b321d2e8d23bb3bdd73)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0a639786506eed02c9c87d7ee1b5b21a625d9a7e8ff2627771886db325f997ed)
            mstore(mload(add(vk, 0x240)), 0x2a725b193c06be27a0de91c96af6b6b4639b8ec1d6989088c59ee9b367f6aba2)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0a24a16261ea45c2dee40a7bea91fa6df7123b8fd10bca3b90bf61be027e0ea1)
            mstore(mload(add(vk, 0x260)), 0x0e0770f6059e9b12e598def34cb15917fdebe1e7ab8a13fc6f595581865ff6e9)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2bc0fc8173829983762617b020e86ff1e47c10a35f4b6f98eb1c7c477932f156)
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

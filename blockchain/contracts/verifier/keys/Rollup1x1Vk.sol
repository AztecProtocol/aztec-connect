// Verification Key Hash: d9550d93cda8457e5bf9af67dfe906945565d41e8da03c97567d2d1434042a86
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
            mstore(mload(add(vk, 0xa0)), 0x252f0a1cc4f045dc9a79721a9bb27a773e95cbb4f247a90f442b6a5be03de488)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x09a202c1e5d587c9c8855a186dade1d28b0b785f9397a89ac35e8903be8bac8e)
            mstore(mload(add(vk, 0xc0)), 0x17984f0b8f52fe9d9be64ed7ed058c90c90eea63dd948f48bd8186737b3f7f32)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x21f3770aba861256531ad15b4e79094b3f3a5521bf20738961123f32e6c191cb)
            mstore(mload(add(vk, 0xe0)), 0x0c24178e15df5469c5bda53272f812874ae66373dd4ac4fa8da594685b6c6f00)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0738449990ad6d188d46ae550d642189983e929ec841c44fd775766ff7b2a7a2)
            mstore(mload(add(vk, 0x100)), 0x1150a6268f63b33152b6804e764fe386f9419f25b3020c6b0e08cea6817bdc2c)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0a9398b416cbea4d9af845c94ba7a60b106d3edafb96944b9be442f6a9aed516)
            mstore(mload(add(vk, 0x120)), 0x1b409d4f95db0cba44d434d09d2b3c43351e7c5d13f482135b60ee253d27ee8c)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x01485bc0f1d62721e4c2b6b2b296f24f96f4dffdd7c60b92d194117af8cbc8da)
            mstore(mload(add(vk, 0x140)), 0x05f73c5506f004f495e7476b298c7666b0a1143fbe164837fb4ad00ee9f24693)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x000afec702033429981c7bb590ac01672e3ee25457ed07ad60d26a3d25b87809)
            mstore(mload(add(vk, 0x160)), 0x014a577bd3229513f2d7dba7b22f4cbba5afc4964c84ccb09cb17c0fa0c07e3e)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x165a18809a687d010717fd20510ba82c759de4112b11d0a0cc9b031ebcbe666b)
            mstore(mload(add(vk, 0x180)), 0x0d62e3e24c1763eab5522c2767899eaef2d8023eea3cdd723bde8b0b9bb474b9)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2f801dc82dcb0cad6e36411a0187245ef4976678be2c211fb9a92797b2a66745)
            mstore(mload(add(vk, 0x1a0)), 0x0b0c7e112d2cb6b1a2b0ab40188ed6d6b611dfcec0b4ab13951c4db1a2e83a54)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2867d9022e6f5fde88476360ac3541f66d2ca036f55a8ee5dbb46ea4dcea2a9a)
            mstore(mload(add(vk, 0x1c0)), 0x12e2ba7036905c965e8a793918d8c8a5564623ae1919b3bc80ad7bb3285030dd)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1b1f9dabc2210a836782ce06ed3f483c896b730eef9bc70e1ebba0b9ab3e1547)
            mstore(mload(add(vk, 0x1e0)), 0x284f4b244c7c610bf851f20e6c8a788fd2fefde5f55720d2b941b34443381b84)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2f3b97b9cfa90a68acd551452aa15c61784a8cab0e2032b4268554eee94d991b)
            mstore(mload(add(vk, 0x200)), 0x100570a0475be298fe232c04e846e7bd957964847721ffebefcec03ee3069ade)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1807f8da40ee6cf2237e2e5079cd4ac551a0367d642bc5303cb7b3bce33681e2)
            mstore(mload(add(vk, 0x220)), 0x162dd6164839db19610f3074d1bc49e682a0c862c12a5314c57d5fb490575895)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x20a914932c7dac48c224b23592a5179123a2af0b81e3e42f8a8913082d476218)
            mstore(mload(add(vk, 0x240)), 0x12931823b3f4b58a3f3e467692b20480e1d8e69d4f2512d89a527aa46a2bcdce)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2730c7944ff9823cbc96a44a1502f729dbbc73e645a7e210d21cf8d683ea41ed)
            mstore(mload(add(vk, 0x260)), 0x22cfc5773f43842a0378bd375a425061e7f65f458dd4910d97f757d860c535ef)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2479abd0b4a79c61da2cb5c2401cbe3babb57f3e1fdaa294b2efe781eb5df988)
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

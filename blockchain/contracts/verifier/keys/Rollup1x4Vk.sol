// Verification Key Hash: 90b92b8c9b494af962b7e5f92c0581e2da17f020dce540e7a8f66c40550ba828
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
            mstore(add(vk, 0x20), 88) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0709277ef7ed0e1076bbdeb3e19d16d808878d0b7ce75c5abec1af9f7790bff7)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1289ac5c0496a4394a3270a40b2bc6a11080ebc4da0033b6e3e5879b71f17ffb)
            mstore(mload(add(vk, 0xc0)), 0x1800fdfa712ab3dcfc57aa5871b1b164837f726e8c5416832c60563bd34ddc90)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x20b15be70ea0ee5508f42a671d20d081f59ac19e03db9a5195745ccda56da09c)
            mstore(mload(add(vk, 0xe0)), 0x274b67373e0dab23b104bf9f67f003b86a87a6680d377de16c4454955bebd568)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1e7f2efaf7498a56df1991e3b52a07bcb7ce6183bec506eec72f379cabe2b3fb)
            mstore(mload(add(vk, 0x100)), 0x121b736752b95b899c6607392e31adfc6f33f88096030450627ff2befaf497de)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2ca52858cebf5d1a2704be317008f75cf25b3988d8aea51b4e70783a9cb1e4c5)
            mstore(mload(add(vk, 0x120)), 0x0e4872b14e1a0caef704a1e72ff37633c8c718bc264e872b449c5ff99e014fee)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x29b0615c53879ef7c0ae43104cd3a2449cda70a3a54570e66ff461aa7e2b277c)
            mstore(mload(add(vk, 0x140)), 0x29eabbb9a7b3e01e9efd4b5836ee4cbf1674d3e83bca5069c57c3c803cec75f9)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1045ab4fae85cefcc8a97bf4744b38d515b921110f3b44e41874635ede447390)
            mstore(mload(add(vk, 0x160)), 0x0353ffc85ac7c3fd83cffadee63909458b5755401aec683e03a38d1dd5d8e346)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x00a7225649e252930e2d4ed9fa6a23be8202fc75a9f35eaaef5976d32fef465d)
            mstore(mload(add(vk, 0x180)), 0x225149c6a430f249c6a10690fa31ef91312f3911b5a6850fb6cd2a4e088e5a2d)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1f1abe0ff2f406eaeedec431188dc65bcf862c611fd6b932f35d8f6381cf6934)
            mstore(mload(add(vk, 0x1a0)), 0x21f3f77e6d9c1b3b7db3c758359f04600f29ce5d92d4ae4c05c976e01ad5c3dc)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x13581d9e399660586a027cb9005aa45c188d09ad100d7f4d48511ae6b6d96051)
            mstore(mload(add(vk, 0x1c0)), 0x08953c96b14e1669acd4b4daa7c12e668ea5e39e06d4410aee216ae2cadc6a73)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1a8a28756880dd899df1ac95df4261711c8b60cd782f0e7ee280d2af951e9e18)
            mstore(mload(add(vk, 0x1e0)), 0x227b87a451bacccf0d72aa6d2c9e38f2761ca0211302999c1eb3501554ced567)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0f0ff101b4dfd5f053009b6647e1731b9d3c6d1955bf28b2b3ac87e6489fc86a)
            mstore(mload(add(vk, 0x200)), 0x07258818bd93ce296fac8bc69d4f179130cd89188c24676922bc181e9b6fd43a)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0afe7acf59228db473c12e05e0b2155fa3688d34f570ac12c022c555e0898c80)
            mstore(mload(add(vk, 0x220)), 0x2a4f8520d4bc72ce5d403231f202d21ee9702f279a5586a6ba3b0cccd63ba399)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x079a684164a437cc1120ca193a9c295ba9c0fa9464d6d6e38118c4c9e26f9730)
            mstore(mload(add(vk, 0x240)), 0x1a8d56437ec51f0a32e5df296e6341792ddc4ecfa47981bcf28cf032412ef0b9)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x10750ea9c7ba3f439d8605c3e210426281879a08af1dc3f56eb01b23b64a6d93)
            mstore(mload(add(vk, 0x260)), 0x0007cb5f3119f4a70f2e89a526e7cab79e42a5fc27c6f1cf6faf74c2684620a5)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1ad4ab10a2f0fac72c6941930bf6b53211869c8fda42c622aa7bf1b4971c633d)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 67) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

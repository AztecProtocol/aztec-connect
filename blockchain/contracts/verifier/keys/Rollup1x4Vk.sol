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
            mstore(add(vk, 0x20), 94) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1bafbd91c91b2e888e3975ccb0fa7a45a43aac6772c4dd34c27f2f1f21a6dbfd)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2e3929ad6f81c566793e9f700d02a16aca83c92ba217385091454a6197032821)
            mstore(mload(add(vk, 0xc0)), 0x0e2a38bfb00e50a6e076a91b9ed6a4efa9e2200bf97e82f554bcaf08fdf415b6)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1dd95f04e19de95a1ce0cb0402b6fd4748cabc2f523c4c19c316de562a2081f2)
            mstore(mload(add(vk, 0xe0)), 0x200c58cfbe2e69ad8f91ef97f7c742804dd3623d4292fe8f3ecfb9b8756a0b45)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x281a15e9145507eb86d949865744eae27799772d2c02a5703e536611e804e33b)
            mstore(mload(add(vk, 0x100)), 0x1ac81db265bb7d3d5406bc5c02787d150a13338e09e0ef750b28116502082ce9)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x15fa59dce29ff65b14c3d5d1b4b9aa354f5f0e4725defba2fd2c8a22bf3c014f)
            mstore(mload(add(vk, 0x120)), 0x0ea13c775b50a1724e8a12ca957faf451161cb340340981a43ca4ac7bf5d52e7)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x237d0558aec99c411377e097a356a9eee8c8905c35d6664060d86307c9e032bc)
            mstore(mload(add(vk, 0x140)), 0x200827e03fc93e0fc940bd9a968c92c30e7bfa1e5de4cc459be670c0f9b2d50b)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2f1d50070d2173bf4b5436e41fdbfa1c6a0125d8f373cdacc2c19745c2354910)
            mstore(mload(add(vk, 0x160)), 0x2e9b75712ee845b57e862a16ef80318524ba6e8578c257f1a823831c0ea4f663)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2d140e0538da4aa2fa40806ac32b8ed24fc729deebd92fe9e2772bece5e95b11)
            mstore(mload(add(vk, 0x180)), 0x234c2c44f0f18d60022ddef66dd8835001c50f2cf5279d1b5a6160dd895e527c)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x082f7815c04f23c2f2e6de9fa4da6ac4f3ed70c8215ce7ad1535d169c2687378)
            mstore(mload(add(vk, 0x1a0)), 0x19ef2cc07696c66d16f17a43353e5a0002d5a846fc2611117e4e4da69e5b6cdf)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0daefcde8018bbe34f46766039516761ac8efd293c350c3cc7e026bbe511080e)
            mstore(mload(add(vk, 0x1c0)), 0x031f9bf6e30d25242788ec8469c7f76446ff9fcfc052c4de447ef352ba6113c5)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2498a59a740fd859ffce2267b69f04143cdd80725188ab5c3c0097acba058999)
            mstore(mload(add(vk, 0x1e0)), 0x15cbed2963dc925bb43e457b42048feacb5d72ebfac41a017a57247721a0b8f0)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0f72ce4e0706e69ac2149714c4300837b2ac9e3cf7fb67baab5a541669c7bf43)
            mstore(mload(add(vk, 0x200)), 0x0b3c62d427dde58d5248da38168b1684d521d088f2ebd676557804155ab56a7e)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0af18640e0db406f6e7ba4ba3f1cf323d1bf14f5e460711575efca4389de42cf)
            mstore(mload(add(vk, 0x220)), 0x15b73dffed6988931be21dbbe800fc72d762d3b9fd39eddc9536588eedd4f38e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x13b25ef30588ff542b316d346d755dd3f44fb79e36fd3013ba58906f2f8e11f0)
            mstore(mload(add(vk, 0x240)), 0x011a84837c47962be62a25b393e621e76cf7f8ec22896228a7c94be27ae9992c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1fafb75e138cd6ec41ff8b4ba885390504cfdb17aa27c98784e734e8b8c93e30)
            mstore(mload(add(vk, 0x260)), 0x01a5f4708deea3c4cb6dfa5c4495d4cf1704a37b5d42fc8077cadcddd5a3d755)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0dcc324d8befccd3c13e13610d978cba3a28a2bac92d4a4857ba0140e0a6b21d)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 61) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

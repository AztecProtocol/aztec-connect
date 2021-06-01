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
            mstore(add(vk, 0x20), 78) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1905de26e0521f6770bd0f862fe4e0eec67f12507686404c6446757a98a37814)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0694957d080b0decf988c57dced5f3b5e3484d68025a3e835bef2d99be6be002)
            mstore(mload(add(vk, 0xc0)), 0x0ca202177999ac7977504b6cc300641a9b4298c8aa558aec3ee94c30b5a15aec)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2fc822dddd433de2e74843c0bfcf4f8364a68a50a27b9e7e8cb34f21533e258c)
            mstore(mload(add(vk, 0xe0)), 0x1a18221746331118b68efbeac03a4f473a71bfd5d382852e2793701af36eba06)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x21b2c1cd7c94a3d2408da26cf1f3d3375c601760a79482393f9ff6b922158c3d)
            mstore(mload(add(vk, 0x100)), 0x2346c947ff02dca4de5e54b2253d037776fbcfe0fdad86638e9db890da71c049)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0d97ce16eb882cee8465f26d5d551a7d9d3b4919d8e88534a9f9e5c8bc4edd4a)
            mstore(mload(add(vk, 0x120)), 0x098db84adc95fb46bee39c99b82c016f462f1221a4ed3aff5e3091e6f998efab)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2f9a9bf026f0e7bca888b888b7329e6e6c3aa838676807ed043447568477ae1c)
            mstore(mload(add(vk, 0x140)), 0x12eca0c50cefe2f40970e31c3bf0cc86759947cb551ce64d4d0d9f1b506e7804)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1754769e1f2b2d2d6b02eeb4177d550b2d64b27c487f7e3a1901b8bb7c079dbd)
            mstore(mload(add(vk, 0x160)), 0x1c6a1a9155a078ee45d77612cdfb952be0a9b1ccf28a1952862bb14dca612df0)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2b49a3c68393f7432426bc88001731bd19b39bc4440a6e92a22c808ee79cef0b)
            mstore(mload(add(vk, 0x180)), 0x2bf6295f483d0c31a2cd59d90660ae15322fbd7f2c7de91f632e4d85bb9e5542)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x03f9cc8c1db059f7efe6139ac124818a803b83a878899371659e4effcdd34634)
            mstore(mload(add(vk, 0x1a0)), 0x198db1e92d744866cff883596651252349cba329e34e188fea3d5e8688e96d80)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1683a17e5916c5b9d4a207cc851046ce8c2e4c0969c9f7b415b408c9a04e1e5f)
            mstore(mload(add(vk, 0x1c0)), 0x26d32da521d28feac610accf88e570731359b6aadab174e5c54764f5b27479cc)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x23da92a89982bb0c3aea8828d5ba5c7cf18dafe5955cca80ce577931026169c3)
            mstore(mload(add(vk, 0x1e0)), 0x27cda6c91bb4d3077580b03448546ca1ad7535e7ba0298ce8e6d809ee448b42a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x02f356e126f28aa1446d87dd22b9a183c049460d7c658864cdebcf908fdfbf2b)
            mstore(mload(add(vk, 0x200)), 0x1bded30987633ade34bfc4f5dcbd52037f9793f81b3b64a4f9b2f727f510b68a)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x18f40cabd6c86d97b3f074c6e1138dc2b5b9a9e818f547ae44963903b390fbb9)
            mstore(mload(add(vk, 0x220)), 0x0c10302401e0b254cb1bdf938db61dd2c410533da8847d17b982630748f0b2dd)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x070eec8345671872a78e1a2f0af5efeb844f89d973c51aabbb648396d5db7356)
            mstore(mload(add(vk, 0x240)), 0x2372b6db3edc75e1682ed30b67f3014cbb5d038363953a6736c16a1deecbdf79)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x28d36f1f1f02d019955c7a582cbe8555b9662a27862b1b61e0d40c33b2f55bad)
            mstore(mload(add(vk, 0x260)), 0x0297ba9bd48b4ab9f0bb567cfea88ff27822214f5ba096bf4dea312a08323d61)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x174eae2839fb8eed0ae03668a2a7628a806a6873591b5af113df6b9aa969e67f)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 62) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

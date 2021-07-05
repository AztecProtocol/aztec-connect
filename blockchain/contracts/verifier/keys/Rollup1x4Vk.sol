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
            mstore(mload(add(vk, 0xa0)), 0x182c66360afa0569669563e6fb96dfe41249f93ff2d5b22737a3d1051fdb03fa)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2d6a35e9c66afaa10e0dca4f50288aa3635d48a3810f5c8c710795ab948fdc47)
            mstore(mload(add(vk, 0xc0)), 0x06c8c02ac8398fef804ba86c13a7e4447b60fcf48d71747c81d745163cccd674)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1fe12cc3ae716197cff8c9cfe924ff2148df0b2b16867b8ba2ad48c5a31b9b56)
            mstore(mload(add(vk, 0xe0)), 0x293cdc7670ad081cad06d22d8fa92ecdc32b3cb16ff14a49aa622184bb56d2c5)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x06ff16c4e29d1b09cd17b309a4b78e96c989dd8f03ad6a673eb99cb245ab089d)
            mstore(mload(add(vk, 0x100)), 0x2d240deb9050e9a6db88f31bfc5a1585c435256c1d8fc09669e1894135eaa219)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x26ba12fa41cc704b7c9aa870623a3ea8f7c784d3e3857eb6e04426b185c2dd01)
            mstore(mload(add(vk, 0x120)), 0x1e6ae9eee9b3d23b01ad6cf51f55a79df80eef22608a43c6e651a1e3339c02bb)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1545b8ac8b7551757b9b9b23d13633967fe70bf7a4940d13b2962b875d15cab9)
            mstore(mload(add(vk, 0x140)), 0x2fba71f7c97a29768f338dfd77e41c6c5695f68aed28f506ac0bc1f725e23766)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x28d457fe4395e7ac714484f18bc90aacda7d490262ee42fd52b814add5636613)
            mstore(mload(add(vk, 0x160)), 0x1c921dec0f25380f26098d2d59f4ad85bfb8ec0bedefab7a455ebba6ba21c1bd)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2d837eb858ed047ce87e349ef02f1940bee0941079d3b31e4ebdcb090f8bf3f0)
            mstore(mload(add(vk, 0x180)), 0x254010d4197e5b42fc84f4200f01a20e174df66e83dbf93fe31ab9b64a2e91db)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2522cec4ef3054d81c9fcbd9988b1cff872284803f3c8018a968d1983e5b0ca8)
            mstore(mload(add(vk, 0x1a0)), 0x16d22ca4b2119d6d199cc8e0d99d364778bc980946af13a0361522b8c08b95cb)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x18f77d93a613d7b2d24c6b635dd4b54feb8a1c576a269eada2f9e08e951b766c)
            mstore(mload(add(vk, 0x1c0)), 0x2aefe202e397334d83eaaf8df3f87ec25984aa7e994222a91b4e6a189f60df8a)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x008cf67c09ff2e1eb4e295030325942a2f4bc3891797d4d3ac6177b069d85dca)
            mstore(mload(add(vk, 0x1e0)), 0x27cda6c91bb4d3077580b03448546ca1ad7535e7ba0298ce8e6d809ee448b42a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x02f356e126f28aa1446d87dd22b9a183c049460d7c658864cdebcf908fdfbf2b)
            mstore(mload(add(vk, 0x200)), 0x005ef52e2d89ec90baef8418f23eb080076d1546ad9ed818599aa37543da25d9)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x016cd290ec39448e63326efb1366987e3721ea5c937e63687062ec6c9bd32cf5)
            mstore(mload(add(vk, 0x220)), 0x173a1dd1f146b53cd4b24c76ff104d266c480a1a0a262fc2606a16d267858af6)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0995dd3975872a1e9dc59452e1108b6985d1e0dd71ac5385829d75861a36a372)
            mstore(mload(add(vk, 0x240)), 0x0a384d026d9ecc1f7e63fc519854e08a0e1db485b17c695e740ffffdfb9f93b3)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2c61897b8a2546da7cd92bf58d7a5546e694fec52ed8137b186326ebade568bd)
            mstore(mload(add(vk, 0x260)), 0x271a545a2f54ef1bfe6b0c8822f690577c264e4f7511829663dbfb3d28b1d536)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x070466c2e16e7b344534158d6c6de3dca2cfbb1a519a1227daa3f1850cc2a559)
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

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
            mstore(add(vk, 0x20), 1566) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x161e27f22438f2aee570e327082de3cd1776ef01f9d6fdc480b95e345ceaf8f1)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0d7db39af52ad3b396966731415cec829be1e3f1ec2893bb343c4c9e972d085f)
            mstore(mload(add(vk, 0xc0)), 0x1e6c387b0a2e89364b4c70592b01c13c3e2faa62be35e549b4fc55f039105bfd)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1cc25e138d8d67eba1c2ac9a13fa360030bf68d46a6e07acd0276d97c90acdc7)
            mstore(mload(add(vk, 0xe0)), 0x140e0c4847308c1fb9b306481fc1cb3de9598c133be1ea2d4cc967f83505985e)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x28338cc7337dd35dfd68a5b345764e64f03fdda69f10bc087c6c742207f573e6)
            mstore(mload(add(vk, 0x100)), 0x0a6d45548c8f1f05a0225f52adf6a44a2b08e95ddc547a0a3b5c4c94c40be796)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x05eea5347237a2fd085eaf8c0d22372e3c1d81e03ec6eaced2ddd001d5975c0b)
            mstore(mload(add(vk, 0x120)), 0x2f1db80ab21136aa0da0980cad723f03ded3cb965bb0d93ce88a65588736f7a3)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x24339cfde529de52cae95d456260d7397bd69ada57d5c174bbaf2bac00cdea2c)
            mstore(mload(add(vk, 0x140)), 0x07d2ae10a9dfb2e8eb652b7337b924c1280a9164c10d3d96a0f431efe3be6a60)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2574fd2a628ea9c4efd09fa52ef6c71adefd18a21dc5dd1a617fdeb2fd696f82)
            mstore(mload(add(vk, 0x160)), 0x01f1bb3632df56366c2dec37ed2bee1125fa88cd5c516b922cb193b97ce2c802)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2b651694468ece4fb2beb277353c531caf2e2a20338ee8a2618baf90336f3ef8)
            mstore(mload(add(vk, 0x180)), 0x11b9601042cbd3695f01c620906ebe6d7a57ed2fc43a2da82ab7808486c9fb5e)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x205c1b1b6ac80dda714c65ec93d36557f2440b3e58e3c9e806fb185a4693a087)
            mstore(mload(add(vk, 0x1a0)), 0x0c8148854d6a076cfb66bdf55cea21dd56d4fee8ade076f43e9ad8a41dabe54a)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x13ffd64f9b850c3ba31bdd41e90d2bb9fc93e12672aea0d732ef00e1180822f3)
            mstore(mload(add(vk, 0x1c0)), 0x1b904873e10a21cdb3479d8135095bcfebed99288c9a8da11251829f07c659d0)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x06d240da0dc0d77daf96939ffa812669b583072554c422f68bb2b0a29ae58f1f)
            mstore(mload(add(vk, 0x1e0)), 0x2c1e3dfcae155cfe932bab710d284da6b03cb5d0d2e2bc1a68534213e56f3b9a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1edf920496e650dcf4454ac2b508880f053447b19a83978f915744c979df19b9)
            mstore(mload(add(vk, 0x200)), 0x1470255ebbb72c6012a6d7a9b46d4221775fbb29ecad29e97fd31674ad759d37)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x07cefce0f402b93433545d4ccdfc8b72f3b3c0d5728646b32684f7a5c8c0b7b3)
            mstore(mload(add(vk, 0x220)), 0x23d910c5baec75999a0f639b0e0c40bc55a3c0619955f28fae6c1f5b82cd9b15)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1e7fc371ed0a0bc66d73c0bceacbb492206e7c1359925fa723dcd08050bd4cab)
            mstore(mload(add(vk, 0x240)), 0x0977364c71f1c45f94139893a90bce09233f15c051c25e89be66d51c6086ce33)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1a7bc4b504f23316a850504ba9af2809ca53a1fed95b3b90426872034f0188ca)
            mstore(mload(add(vk, 0x260)), 0x1ccb87d8279f6a74c6ca39f72ef964f7c723d0a23b6793e390ba711467f2253f)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1223b4cb05cae753b31cec03504016756a3b307ede8b56e7d0fe777b8473ae61)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1550) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

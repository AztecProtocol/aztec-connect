// Verification Key Hash: 3dc9b5f71895b95fec1cdd4bf4865731c22880b81a0366e5e2977e46ec8c5c36
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
            mstore(add(vk, 0x20), 1352) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x024e61b14bbef4d36a5ea65d105b319aa0d8796603b291fc4ef5f6cbb0977e36)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x03e9e626a7654a346117655d0896de1ac9436dd4011ed39b234e54b2402a10f6)
            mstore(mload(add(vk, 0xc0)), 0x240fe331824adc526ac8a14c63d53b4f0f6b579bee19fdf2df50cce84da6bdaa)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1c4cbf091000b5553d1a309117b4291b1245c89cc33c3a157de328ac8d11a7ae)
            mstore(mload(add(vk, 0xe0)), 0x2a6c7dec16dfbb1aba591b7848dee4fd99c8923c09dda2545f3b1df7100a8599)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2bf2912f5e3caea481e95242038cf8ffdd87937e1f830670a931734399c99bb1)
            mstore(mload(add(vk, 0x100)), 0x0d4fd91cafb9f10120649218898524286e676c36d24c84eba0bd688f33b8214f)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x218f4fb610ace0c9f329502933ae61c19ac864ef1dac577c7335012b754eaea0)
            mstore(mload(add(vk, 0x120)), 0x0baa9fd1182ee53d0d7ab7af3a9741316103e3d421cc115eb95dc01d901d23f6)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2612d65c325162dcba93557359512295985a9928b863b367f1c3122a1929eab2)
            mstore(mload(add(vk, 0x140)), 0x2bb28f915f71b3bfb7b89b8b125fef5692c1137075f00fb378bdb0c4e0c64e8d)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2b6d6a39992915fbd99f991be28efd90dcd5dabf4599eccc0fe358075f096834)
            mstore(mload(add(vk, 0x160)), 0x1490557af98f7712467215b7e9cf1d07c3b6a1419e6fb403f02155606dee6572)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0f7cbe57f840e2533e8c2c5b70c7ea49fadc7bfa76da789e381b2462a7762e60)
            mstore(mload(add(vk, 0x180)), 0x096c314a8fb785a99ec954e46e259ef268f309dd07ec92f553aac1230a427ba3)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0a86a722b9431cf1fe28678267e35637d0688714e79e24d4ac86ab1b8366173f)
            mstore(mload(add(vk, 0x1a0)), 0x2c197e5517560a0814756f0d4f99c03f2c2d13b2f55d61fbaaaebd276508b118)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x13c724064fd839a685de0afd7354258cf5c42983b5c13c6e5b3729cb8e4821ec)
            mstore(mload(add(vk, 0x1c0)), 0x1241937df7a1f012647b84cf2fda6d833c433e7f188831f3e0410d0188f08ace)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0ac1db6a19524077ba650b56fdc9af79404344288a23d27555b22449ac483717)
            mstore(mload(add(vk, 0x1e0)), 0x13a9d177c9f4f3e59589f024015e4a3bbeca1648caa6aee743edaacac427431f)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2204fca96eea203a8b58ee1da8706c72eec91b0fd57ab64d441ce35925dd03f2)
            mstore(mload(add(vk, 0x200)), 0x261d904944aa9a0dadb5f1d60009a0cfcaba50c2e34326e5429055843722f268)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1b1d8f7ac364c1b6ab595fdfbc24324c431620d251ec3763cc7c7f8b3295ac15)
            mstore(mload(add(vk, 0x220)), 0x1ed6494e1adeda4ecb7e1536d185e9f99274d8887fa8e56f9d50f0797ba01ec4)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1f6ac749045200ec28c95bf17b2ec8cbee93c9be196091cfc26b99397c70d56d)
            mstore(mload(add(vk, 0x240)), 0x042f35f985d755b844d341496a6427f31811b79e0fb68c844e85af6c57151564)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1b1d3ca2cbc5a666948a2bf75e34d0d87865a3986ff51d1e179d45cab3a4515a)
            mstore(mload(add(vk, 0x260)), 0x03b8eb68980104b259159768aa8f85f6c8e8239d29361760efb9881332322a73)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x00944d9d26115d3784a2660df868622de9d54630ebd9720fc07bc75f7156962b)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1331) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

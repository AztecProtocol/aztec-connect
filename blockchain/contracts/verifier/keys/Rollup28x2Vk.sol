// Verification Key Hash: 8006fa6fe33e1c533b080dc5223db1b6cd030c1815c65f6c964be59f388e0c18
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x2Vk {
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
            mstore(mload(add(vk, 0xa0)), 0x166012da1981ba2932eaaec75061eed0cf76bd615143988c9d9bdc621d1df23a)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x11a77561801ac57088ceb2e480885dd0c1ceddeb82eaa352203c4cb1170ec65e)
            mstore(mload(add(vk, 0xc0)), 0x07247627b2fca8bef5c57c4de948c540791f59758422ceee974422276a03085f)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1ad15cfa665a3fe50f70f5192e46257e57c584f4ca02bc28ff84f01c2f45350a)
            mstore(mload(add(vk, 0xe0)), 0x24df9a065d6147f498803c8b0d3416c9f77196d4135fd331b557f89258c3375b)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0de82142bee4574d13532fcd248384f95c4639e6e0164d35dff69e06b368cc65)
            mstore(mload(add(vk, 0x100)), 0x246a91b98ea78be4cffc617941a278ffc579d30338b398c3fc2004fa516e33e1)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x01b34a8cf044e8b8d6e025ca95d71b0cd97c7ff8a3539f6b9418c79a396b9357)
            mstore(mload(add(vk, 0x120)), 0x1c7fdca06ee0fa392664d3dfffa4aba889d5c92e2e8c5a1ec7a8f6c69872b69d)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x15a440e751cfe26dd9dd3ac86e874cd90815ede7acfc014822d710b853a8c278)
            mstore(mload(add(vk, 0x140)), 0x04c49cee2c7b4d64fddba8177a9e5aa34b05320fac83782a1f63ae10ebf633ef)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x126678e73da6657e0dcb9bbe3fd9e46c90bb45fcd219fadb9e9bce41f320b497)
            mstore(mload(add(vk, 0x160)), 0x21f813249a0adaadea300e7b530f35c238feb3ae4b006680bdefb7f84feefeec)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0b5a20e3766b0a180896ab0ea8e5dbdf74ed52def36cd79b9063adae98f60937)
            mstore(mload(add(vk, 0x180)), 0x08642f184b9550c5d184fd174b594c34199c1000653ed63803eaec27657364cb)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1f0cf503defd6540271984ec6afc2f414b59a74e8543dd1e2db656d504970533)
            mstore(mload(add(vk, 0x1a0)), 0x049093cfff5ae5860da768b2c6b728c016af9e4af0853d458550b7fab3400210)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x026d49879d4a88f20a787b8eca20130542788ffef3676672e6d99d7436d7aaa8)
            mstore(mload(add(vk, 0x1c0)), 0x04d4ccf5f347d1f813088af660bf6619aa32a31fb9df62737f7de6419c3692c1)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1e137a9a798ccaef39f1af946482fb32cca9708ccd33b5ca60cd85369b8c549f)
            mstore(mload(add(vk, 0x1e0)), 0x1b6b0ca0857ba4d1b7028fc60ccb323fc4c1e494d3c2fad2d231234690f46473)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x185dc01f3dd1a034d95c95a25b02d0bc79d32b3a433a7c90d13f0d81e8b8e8ad)
            mstore(mload(add(vk, 0x200)), 0x116f4b8b9ed281134485838c4aa0cedd9b2f586ff2bd4149bb921b5c2533fc89)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2739130c27630622007f8c00bea6fba16cf9e7ffc57e0f590333eff884d2aa18)
            mstore(mload(add(vk, 0x220)), 0x164babf923f4b7ff89f682b9fceddc3ed11d6119a1e35585fc8670ddb4876d0c)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x075424017bc1054283a4920490fd39866f4390e596be3e3b0082c67a32cec1cb)
            mstore(mload(add(vk, 0x240)), 0x21764c69a91759bc4d146ef449a1cd56f92c389fff4147064e3d0340ae3936b9)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0e26ef3cbeddce65f7d1e622f4838761e68b270faab63ae914215ae62bc350a2)
            mstore(mload(add(vk, 0x260)), 0x0e8f3a6dbd0d355cde7ce6c39e5b398f7f1e977e63d643f91d735172f5124ba2)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2c0f840e1220b5e5da4ab4c5938ac2fcc1737676979a3d5434708ca347c520f4)
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

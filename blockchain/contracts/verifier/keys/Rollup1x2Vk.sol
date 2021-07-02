// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 54) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2c6f3d3fe2b044f745e12f330b353d57dae405f4b1fb7133fcca51a664485ec7)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x27e8feecefce9c774488e78efc25c7db80175092aeca075b1fe3d7f9960a6b89)
            mstore(mload(add(vk, 0xc0)), 0x0706ca66a67191d457ca8f49130600452940f858b1ee52b94febcd0220601723)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2614af0eadd7ce10ac6ac2fc9fa3014b332384832209ab5f4ede3e01e7ebef39)
            mstore(mload(add(vk, 0xe0)), 0x2b31749692aeb82a162d66469f6cdd8d042e58f724a4b8316a83a8dbd7521e34)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2a77fa68a65ce45d6a63af9e1e615d87eaaf8675395dc1ed2434cf86c6f243f0)
            mstore(mload(add(vk, 0x100)), 0x22c170a42a02722623274160930f99e766ef7496a2b2a2b1ff55e1e5ceb8c3b0)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2aa98264ff40b00a424f5343a3917f4d7e795a00cbe552d76562399797f27cee)
            mstore(mload(add(vk, 0x120)), 0x088c6e093a77db404eecf2ebaf3ad1f0edd75557796bac53d035d3c9ef5250f2)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x03311fcd427d965b79551d6613e0aafd1a9fbecbc74f06652ef0d5725139aa57)
            mstore(mload(add(vk, 0x140)), 0x0e3d2d8fb848de066726d2d55854d64e0d67ec996e5833766f0c10402383cf1b)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0accc2e27119c0f9ba8ec4bf2d3b42e86944dcd1a355a6d32bcedea8d17ecc95)
            mstore(mload(add(vk, 0x160)), 0x1c38a56ffce18c278cf437478f5f0f80de54c77bb40dd5f8e6991e6a2c7be354)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2ed34b441f711ad1ee5f8bbc5da0e88a3b6005943e0fe936918a4b86514648e7)
            mstore(mload(add(vk, 0x180)), 0x301d208eba1a1779047dc65188677c8aef126916288c351816b7b6fc2f3d6ec1)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x028f2cce4e5f875cff6293daa6387adac020b56215380a836f19df988ae9f197)
            mstore(mload(add(vk, 0x1a0)), 0x07c60729f574b01e0e0d682f3e30480c818d32f390fe2143abfd9f6183894e23)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x245726e2464044598f9e99ff0966189bd41a9e14040174c1d407b225e239c09d)
            mstore(mload(add(vk, 0x1c0)), 0x184f425bf1387e6f5918fb733f5a1cb64a0080fa19174ba5e79338060f0e3fac)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x03778699e877990f37469aaf31862b14d2bd927b79833431dfc3dfc0729b53ab)
            mstore(mload(add(vk, 0x1e0)), 0x2956cd5126b44362be7d9d9bc63ac056d6da0f952aa17cfcf9c79929b95477a1)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x19fe15891be1421df2599a8b0bd3f0e0b852abc71fdc7b0ccecfe42a5b7f7198)
            mstore(mload(add(vk, 0x200)), 0x10bdbc78be53ce5b114b1dbc110ca765126944f0db997ca3fddd82104ea0ea0a)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1bb7a112c4ddd63d2e2517ef30f8b19e97a98c2db763863c8c7b09c8c1e6066d)
            mstore(mload(add(vk, 0x220)), 0x01b4fc1e49f18f282f11c4fcda6d545cbc76df8fe70fccc7c1dbb1dc1d3513e1)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2cd5c8555429a6cbffe50fdf947e3c2374984ec01bc241586269f9c3f2938ac2)
            mstore(mload(add(vk, 0x240)), 0x052f621fc53f8ed8c59be395a5af80ca9d9f552105f2df8a3a567ae5549ebf5f)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x06a85901751aca59fa11ec5429a0b5115083b62b4ba8d6848e5c6f6cc716b7df)
            mstore(mload(add(vk, 0x260)), 0x23745fc7849fa491269b3335320c07b29bfe0da8fc311ab01d4b2b6f17aac384)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x05fcdf09a206df6801e7cb35c051d8003486af21f2348fc177c37b46cf5c85ed)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 38) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

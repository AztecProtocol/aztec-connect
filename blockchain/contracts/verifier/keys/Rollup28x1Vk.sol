// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 414) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0706c08f355c0b2c6d09433c2433b5e6018e7bf87da7a814af8364685db33163)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2a003a2ccf6affa34c8b866ea05fac13424b9bda1c77e7121c70b3c54ceabd59)
            mstore(mload(add(vk, 0xc0)), 0x10ba37223179e6377c05a7508ee8e6b51c07bc6454bad11e37d97dfad5a5f28c)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x047b24e0019e2f2d12a1c687ffc331df4d1bbd382546f018b1cbfc4b060d4e82)
            mstore(mload(add(vk, 0xe0)), 0x1e8e675413746c77d7ea50c98bc64bc019b7ca0553ae33270178afb37cf18105)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1054961efc510069ac04725f4ac7d17344e77f751250a97eda719b918593d1cd)
            mstore(mload(add(vk, 0x100)), 0x26a1ac65bfd7947ee4a7f693cd81d9956cdbdc6170ae85e831489c9572503587)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2a18515f918f28f06341e710f1b6cbaf409a044a99b236365eb748f1e075577b)
            mstore(mload(add(vk, 0x120)), 0x244931dbf0a9d057340a6a96cf55cb4a38b99ac3150cd6772024e9dfad5b1393)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2943a029d17a776cb7c25e124ebb036413a0716594955a1085448d1e82a1b378)
            mstore(mload(add(vk, 0x140)), 0x2dc7839c7e81543a3bcf16fa2c3f9f907828d027557d0d650aef9a8dbdcc8f69)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2eef3f178711b589655c0cc27ccae7a8fe0efac72df2fec18ae968fe93f006bc)
            mstore(mload(add(vk, 0x160)), 0x08a4ce8532b322e778d7e9152384faeefc3b225577944fdc8465e16446f2419d)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x084c13508a012fad40e21f903ceb16730b032d425549f9946eeabfd05187c245)
            mstore(mload(add(vk, 0x180)), 0x04c5bca390b8f3ca1157056d86f1a8f3b6df2987f94f0c5fc9cbcde5a546ef64)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1a7f7fe979991a6d414509360b59655a777c0e8098b37647acf7046aec943aeb)
            mstore(mload(add(vk, 0x1a0)), 0x2768569fd3ba59851d7ab16bd209ba837543c3cee50b0e0a93cbaf00def34793)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2dd72927cd481ac6b0308fcc5376e63db240c0894583b48ff89f5c242f230c2c)
            mstore(mload(add(vk, 0x1c0)), 0x2748138851887e9a348b81f0411a2b3adbc66332d52baa65997f0bd0630b13be)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x06354b54646132d4a8e2521ae538b65f3a2255e2fc0a2b3e76b23bf55beab28d)
            mstore(mload(add(vk, 0x1e0)), 0x102e15668c315c11aec87fbd832be9375b6fda2e5d11c7ac72c88b0f806372a7)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x04f290282bece3c71ec851b13412a44d150faf7b120820c89e30bd8820eb9c9a)
            mstore(mload(add(vk, 0x200)), 0x20ba6ec939a0a2ee3758b2aed5731ae704da73fc28d28507da56ea5dd73275a1)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2aebf62ef95465c59edf6ea081902902dc063d44d694764794edd8f29aba1518)
            mstore(mload(add(vk, 0x220)), 0x28075b97c9125abe072dd53c1bffb7c71a30c6801fe2dd2ef6d748f0c04515f1)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x11ea3823b322c6822f2b08c9a04de01ebc42b2832584d69e85a66985c46cc461)
            mstore(mload(add(vk, 0x240)), 0x0037f2a07b4a46d582181c33813f1d68f011765eb12f966583be452d5b838f61)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2470db8fb2aa5b9ecfd0f0b9e8a20f595b1a230bb8158df2b0ad16dda7464741)
            mstore(mload(add(vk, 0x260)), 0x0f6b5fb55a2c1c8ef2353450066d34b9ea106d309a09dc9890a87e5bda861f68)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x264d8bb3bfafcfa8fb0ce29630ddb1f906a5d17aad610940058874033f44a8b0)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 398) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

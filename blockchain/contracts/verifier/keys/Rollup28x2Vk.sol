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
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 798) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2851fba2ecc000acf7220987292853a5c1d53be068b105ff9de3780074cb1793)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x21828a7252fd67b84c51b9d6982d97417d27717f6a51b6c93e97300d1c14a9cc)
            mstore(mload(add(vk, 0xc0)), 0x188c0dd5ed510dfaec82d439a41f96144a993056cb27ab82fe29c7280c96ef0a)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x25b4bbcdd288611d202de54590c969ec05e152b45f0253fac71cbf94e19ba338)
            mstore(mload(add(vk, 0xe0)), 0x0e9df11f40419bbdfff48efd72c2abe03f4b724039e7503a38d89d500bde67ea)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0287bba3b9207555bd2796d869094aa7f23ff502e998a741eeef8045f2703903)
            mstore(mload(add(vk, 0x100)), 0x0b516a57c852c656a844b7cbef1f48c1d6840f4892d713e817a29408f3364d9b)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x29a8f3d431431f0b3b2835b8cd4a39cfb87b648250fc3bb82653c9be438ccc38)
            mstore(mload(add(vk, 0x120)), 0x249782b1aad1d8934c75f6db570b4236173cc16958107df85c3f92c285a44b10)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x020d35e04b0be2cfb47091335861e69fc3fe765fbe8872179a1c6168aeaad55e)
            mstore(mload(add(vk, 0x140)), 0x2f4ca26da448fb9a2f2585e1f790a7bff3b18cebac743ea93ce6f03ebb49b2d8)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x18702a0972f93ef00da4f21e861759302f38fae52d271983fa060ad63f7f1e25)
            mstore(mload(add(vk, 0x160)), 0x1c14ddae0eb50eaf309fc1f36926189dab6a7192e72a16492c443aa2fce6391b)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1aa34c78e7d320724041492e6bd3b607f8e6b6d5552f633b7d218e5b5cd32a42)
            mstore(mload(add(vk, 0x180)), 0x2e38e6252cac51d81c102098b0b37bb75a1b6a9b5135eedda93b5efd97690423)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x217530f9f78aae868233649b6ad1c249bb3bfa0ea00f2bdc39a2dd6e4e3eade3)
            mstore(mload(add(vk, 0x1a0)), 0x101d35ca0d418acec1da102a0b30a5493dfd0695ed781f447b4a32756ed6c55a)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x140514e43aba2576b34443144b9fead36ee85fa8d35a2925a4a38b8d3e216574)
            mstore(mload(add(vk, 0x1c0)), 0x051b63890c9b5cdcf5393e50f164dbfd7a8676f1a3de6a0b20faae8b2778df40)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x23973cede832f68167fbdd6f89aca606a05918fe5d707649a3b9bf4307e85bf1)
            mstore(mload(add(vk, 0x1e0)), 0x16987cee793578cbb589ad2809a892cf1a50dbbb4e7dacb1bea98296689dbdf6)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0bcd0ea4ddf722534eff63986a4facb34cf8b23a966c88da4238092c453ec297)
            mstore(mload(add(vk, 0x200)), 0x1466b5dc5187bc86515e91c63c5c555aece060705d7f2c4a3e04be90f51dafe5)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x03ebba799878863e1d37c301f398b69d21abb06ffa83f371ad366954cd27950e)
            mstore(mload(add(vk, 0x220)), 0x296ebf67f13049813ac688103a04966d1c2c58a36ed52632114ee4b7fa15b920)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x03065a49e013ab3607cf846a0828324a6cf534802c379cbda0d16854d83c1514)
            mstore(mload(add(vk, 0x240)), 0x1585f0db20ecf0eed545e814be3552d065da2e84368ea5b1e8e17e0c6751054f)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x18b1d2b5273eca4447ee243c28531e116b95e92685dde4c8c3c0eaf0ddd11599)
            mstore(mload(add(vk, 0x260)), 0x05d24cb2d9bec2af4d1f83a94326273e5a7fa9cc0646c470f43ec131b420cd9a)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x009c7822471176d91b892a1353f8e46a11d712ac1d7007ba9724a2096e2f4e8e)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 782) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

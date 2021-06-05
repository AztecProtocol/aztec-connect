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
            mstore(add(vk, 0x20), 72) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0dc3f07f0cc02987bc07aac1f26d29af7f3647531da0985223ee3a6ed17c9b02)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x246ea7195b739785772fe57db2594a7c072de56d580564f045c458a1d37c2070)
            mstore(mload(add(vk, 0xc0)), 0x22df7a08f98df201c05b6e200733f17b2a3cba6c421ddfc0698c9a72aa8e1578)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2662c9c3aa84bfb6ecc93788a2c2fb219a55f3f7ce68449ad2cb4f2b09ce7619)
            mstore(mload(add(vk, 0xe0)), 0x0d2402b727654ff17f27123711869b42a676796319300e93e5713ce58a492b57)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x23794c03f4a3af6db56343d0dc0f2fd5c63b6378e5ef153b8da1eb45ade07f15)
            mstore(mload(add(vk, 0x100)), 0x0221a44a1b99365100ff1f28eb71f383e0baee0d12c787ce0a5219c2b97e199b)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x227187332ecb27d21b4bbbcee06cb79f240d4f3b55260055b48764e388682ae9)
            mstore(mload(add(vk, 0x120)), 0x14db9621ad396e6163a70fec8179feef855ed4705578e092234f2d41331cd909)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2237a97ee15c1226fba13a4b91fb9d11cff9d9069a565385d84248ff724cc315)
            mstore(mload(add(vk, 0x140)), 0x2885a39e8a30fdde49b6b2e7df59d20a9dd9bc58b73b83d4c6bda89d44af30d4)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x040660e25faff82ee9c0365f8863189f6c2cc017a3993d787b234c1720bf481e)
            mstore(mload(add(vk, 0x160)), 0x197ca1eebff292475f22971edaeeb6b755082f6f562ad74ffcbaeef606437ce8)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0ae115a48d7add7733cd128a6c52423d028413d8481e7ebe678fdf34b1e2c5f7)
            mstore(mload(add(vk, 0x180)), 0x202b74e5cb39a406b5fc6b105f1a562eb61adc9ea77e1139bf451c52ca6813c8)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x09af5afc56b1825d3437819f2f739c3b6cfe0a05fb8552c12c21ededf3b40c9b)
            mstore(mload(add(vk, 0x1a0)), 0x1c201ec7b26c6d705489c48b40d710d0ac16ac166110652e65c3fec7ff93697f)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x05941ecfb3e18e254ab0e4d6b1647d3cef77045edb13779b002fae5c00767ab2)
            mstore(mload(add(vk, 0x1c0)), 0x27500ea2a8c6a6d56fc55cd1de8399783909bbb5281f1e012bf4c9c90ebdaa50)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2b852c8e04dc500a7b04ac84a413876945fa3220864ac20eb8b33c7a0ca29d28)
            mstore(mload(add(vk, 0x1e0)), 0x1b77f9d19d830b53381d3fc176b2211da460600fce7ad3154b4303e987f6c632)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x15c0aeeb4f212e93d8b85dbc2c2f98c505124b638df8d55455264dafb0128f50)
            mstore(mload(add(vk, 0x200)), 0x079c2d2c823d2399ac6047b609df73f6134563ecdff936cecdb6d287374e1cfe)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1b0a14d34a5dbe472a8cc94c6ddef0998ef9c7bdeae59e3e799621c5e66cfb06)
            mstore(mload(add(vk, 0x220)), 0x05678291a75b9645d888f29409dd9ad4a6987ac6aaa563855578061d0a59d638)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x18fdf7498b92237983cc27bd78e1b57c2dcf26f5d53a3e699cdbd76056703270)
            mstore(mload(add(vk, 0x240)), 0x058fefb7b06939cf148a44b731fe27f511ea4fca866c3c6552713861c75ff86f)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0343c2952939c2d990d06ef2d423bc68d4f8db181f3a5bc30905e666d5506e81)
            mstore(mload(add(vk, 0x260)), 0x10ff4d00f1dee693f533d3c5903edd3d837a916596a1c0dc17217ccce72ad862)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x05133ff6331b4543ddaff97a67afdeea3f18b004cec2eafb49b0693c4f665531)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 47) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

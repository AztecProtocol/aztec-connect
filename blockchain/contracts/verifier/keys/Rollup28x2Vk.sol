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
            mstore(mload(add(vk, 0xa0)), 0x0f0d0bfb6fec117bb2077786e723a1565aeb4bfa14c72da9878faa883fcd2d9f)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x15c54ec4e65aa7ed3e2d32812a8b10f552b50967d6b7951486ad4adf89c223f8)
            mstore(mload(add(vk, 0xc0)), 0x0a9996200df4a05c08248a418b2b425a0496d4be35730607e4196b765b1cf398)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2a040c7281e5b5295f0b7364ff657b8aa3b9a5763fe5a883de0e5515ce3c3889)
            mstore(mload(add(vk, 0xe0)), 0x25c60a9905b097158141e3c0592524cecb6bbd078b3a8db8151249a630d27af8)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x3061fbf11a770e0988ebf6a86cd2444889297f5840987ae62643db0c775fd200)
            mstore(mload(add(vk, 0x100)), 0x177117434065a4c3716c4e9fad4ff60d7f73f1bf32ca94ea89037fd1fc905be9)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0d660f14e9f03323ee85d6e5434e9c87c98ebd4408ea2cb7aa4d4c43f40e55e1)
            mstore(mload(add(vk, 0x120)), 0x0df6c77a9a6bae51cee804b5c1ea6a0ed527bc5bf8a44b1adc4a963b4541a7be)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1d8fc177b0b1af86d92bc51b39280afb343dbba2d2929f28de0d6fc6656c2917)
            mstore(mload(add(vk, 0x140)), 0x01dfe736aa8cf3635136a08f35dd65b184c85e9a0c59dac8f1d0ebead964959b)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2a691233e2e13145e933c9118ec820af49488639045ce0642807b1022b3c74e7)
            mstore(mload(add(vk, 0x160)), 0x07d69a43886facf8097f8cad533853c896c580aaeb533a02ce7dc5cf92f21ce7)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2d9c7ce74cb26cb62559bc4697d9cce0c0405d7afabff15c3d740c90fe5fc698)
            mstore(mload(add(vk, 0x180)), 0x2cc2690e4100f95c939a850467e6adc5d906b2f8e7e5d1444e38278e241559da)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2d88c17306d76a91cc9e0b7e225bce42c174819d0e1bac7ee9796081a8285e2e)
            mstore(mload(add(vk, 0x1a0)), 0x0b103de069011640f2594cafec9b5ae2eaa8dadbf83be5891cf7e3119f78bf7e)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x13fc1c920188a004ab78d7a825d1277ffa1cab0707a3cf78874893eef617d3c0)
            mstore(mload(add(vk, 0x1c0)), 0x0de3e722e1a3c2383a2e8939075967c7775ec5b89bf5063b178733051defd1d7)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1aff0c1424638eb7c2df2bad7b97ab810aaa3eb285d9badcf4d4dc45a696da69)
            mstore(mload(add(vk, 0x1e0)), 0x27257a08dffe29b8e4bf78a9844d01fd808ee8f6e7d419b4e348cdf7d4ab686e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x11ee0a08f3d883b9eecc693f4c03f1b15356393c5b617da28b96dc5bf9236a91)
            mstore(mload(add(vk, 0x200)), 0x21fb5ca832dc2125bad5019939ad4659e7acefdad6448dd1d900f8912f2a4c6a)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x13cef6e1b0d450b3fe95afdc4dc540e453b66255b12e5bf44dbd37e163dcdd40)
            mstore(mload(add(vk, 0x220)), 0x02f89ba935374a58032f20285d5a1158818f669217a5fed04d04ad6c468e0791)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x26a802cc55c39f79774e98942c103410e4a9889db5239a755d86ad1300c5b3c8)
            mstore(mload(add(vk, 0x240)), 0x2bdb1e71d81c17186eb361e2894a194070dda76762de9caa314b8f099393ae58)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0efdf91c574f69a89a1154cd97e9dfee19a03590c71738670f866872f6d7b34f)
            mstore(mload(add(vk, 0x260)), 0x2f16de71f5081ba2a41d06a9d0d0790f5ea9c2a0353a89c18ba366f5a313cfe3)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x072220b85bcb1814c213f4ea717c6db6b99043f40ebc6f1ba67f13488eb949fc)
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

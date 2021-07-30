// Verification Key Hash: d7bea7cb44666e8d0edaea585addfc6757b0271d031ffe7e2de5e3376b21ddca
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
            mstore(add(vk, 0x20), 92) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1e052de527c2fa083df07d1f6d1b874098b35d262ef488c73ed6a06b64e8bac6)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1f1be74704d5403c706559f0ade3d009b3b6904a4812de3b4c33476a81c60037)
            mstore(mload(add(vk, 0xc0)), 0x25778980a79c60e5ca582f91e1878473615aa59a6ca0387ff51dd3de0bb68bc8)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x02c4b8a23ce4bf3b15c98f3be78001b82f6a883546c599c2ec3b2815c4f1603f)
            mstore(mload(add(vk, 0xe0)), 0x19760cc4b148f8d85df0d0e0391d86ceb31552e1c6dd6714329be829667cc554)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x27e2801be3603fcdf55dcbb759cb7795c792d881801e340dfb569ef9d7fcd233)
            mstore(mload(add(vk, 0x100)), 0x0a6ee3c98112a452f77e9eb231eafe4038d93ae9c235df4514437af06ade498a)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0673e2167929a7bbc194fd57493f59c2ad11dae150ba0738ef3e6dfb13ae416c)
            mstore(mload(add(vk, 0x120)), 0x27203054f7b1cabb330c60dbdef7a55b9aef5cf54172a7f7f30d8082a3bfc47a)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1a2dfc2370e91b7defdf987523f069d3affa446e53e738f44dcccafaa4adc9ff)
            mstore(mload(add(vk, 0x140)), 0x055882f3a401d7b0a21f01f1acb79a9ff278fb67994575891e251673dc6616f6)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x00e405740497b837654ff7be93785a49ace93074b5cb80914aa8106ed32ed639)
            mstore(mload(add(vk, 0x160)), 0x0ad99e503b09a996e425fae80fb60ba7607989bb1c1d9bc91e5ed9c0ece03c78)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x117f42d6671492a9e38d4e0645a74a15deb055d54c3fa6bcf73b80c3591a3a5f)
            mstore(mload(add(vk, 0x180)), 0x13b99a28146f767f814669c43ecc9f2b2e974ba633f6bc6e1485298685b23d97)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x220156d2fe8ecc7e10c38377cf3d6202dc6901bcd3b41998ec61173e1bc6562e)
            mstore(mload(add(vk, 0x1a0)), 0x1ca266194644ce1fcb63c180a69b7a393547c271ee9befe0c31519a00b79eb23)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x16027942e34982acc2bb7660bf1316e7047c50e54c31f366d6787302030a40a5)
            mstore(mload(add(vk, 0x1c0)), 0x2c61cff98f362905b98792a1008b707b6c88708240c93fa12734204a05135f12)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1907e3f2bbb233934a9e79e49eb21162165a490f0573bf2cffe15cfb5e3bc9bd)
            mstore(mload(add(vk, 0x1e0)), 0x21884c9741bc29f31615af21887b6423c3e0735d408b209501c5e1fd024755bf)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x13f1e3d9635f09ce2ea00e2cccd6cffccaa135a6f10a0046ad988488e72f60a7)
            mstore(mload(add(vk, 0x200)), 0x278a12b2b81689a24152d129b9e91ee4576884aaa5c85abf13940bfbddd6f99b)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1afeaa5a1da91a6396f51f5621fc6f6f5f70de8b3e127466066812ce5774fa89)
            mstore(mload(add(vk, 0x220)), 0x0fe6e444ad02e50e4cad198d6cb40078a28b1e624c008e9c929d7585a942c50e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x21479f3932e9f96ff3032c64de4d1f1bebd47005b9264def15e5eac05f4b226a)
            mstore(mload(add(vk, 0x240)), 0x29c1127214c85fb36b2ab237624b4cbb7ff3c78e00f3b28f9ef89ca757a79000)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x20b25da82098aed514990e85802be726a67a616f3f333a90ce3bf0e820bd86e6)
            mstore(mload(add(vk, 0x260)), 0x025b835967f001694c57cbaec7d25729c755b236828f8f93e552ea7c2d1f2b74)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x13a5d62168a5cdfca321bc294052a6c290194a95b009321062a2d76521ec037e)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 71) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

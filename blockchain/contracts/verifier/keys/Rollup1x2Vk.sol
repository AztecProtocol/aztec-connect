// Verification Key Hash: 22ad51d0ea16e58ed3fa627f33056b55e0feebbcafa7a8f8c63d65e1d212aaeb
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
            mstore(mload(add(vk, 0xa0)), 0x2c984e122ab475fdf5625faebd0fcfc3c7b0800ab58fc23d3d0ff729d38de92d)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1971020f56defa050dccc6f632d86b25fada6db99153a42aaa501117a340f9dd)
            mstore(mload(add(vk, 0xc0)), 0x110467008f953c30aa559ab85396717f35a897c86fc5017a495f9b3f4e8eb549)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x06049ccef18d02621931574ea19ea207f663434d0d84d4c79b1f82466ef20021)
            mstore(mload(add(vk, 0xe0)), 0x19760cc4b148f8d85df0d0e0391d86ceb31552e1c6dd6714329be829667cc554)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x27e2801be3603fcdf55dcbb759cb7795c792d881801e340dfb569ef9d7fcd233)
            mstore(mload(add(vk, 0x100)), 0x0a6ee3c98112a452f77e9eb231eafe4038d93ae9c235df4514437af06ade498a)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0673e2167929a7bbc194fd57493f59c2ad11dae150ba0738ef3e6dfb13ae416c)
            mstore(mload(add(vk, 0x120)), 0x27203054f7b1cabb330c60dbdef7a55b9aef5cf54172a7f7f30d8082a3bfc47a)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1a2dfc2370e91b7defdf987523f069d3affa446e53e738f44dcccafaa4adc9ff)
            mstore(mload(add(vk, 0x140)), 0x055882f3a401d7b0a21f01f1acb79a9ff278fb67994575891e251673dc6616f6)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x00e405740497b837654ff7be93785a49ace93074b5cb80914aa8106ed32ed639)
            mstore(mload(add(vk, 0x160)), 0x08f337674f863b5a3791bb2978d605eaa8584d2d246fc516a8710c5d1a9da7db)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x10f34737a97bdd00837e2b9fa6ba08b448b461438bfbf3356f2b57a7807d7b26)
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
            mstore(mload(add(vk, 0x220)), 0x0121578c4af8e397746fbde2d0878c60ccd289156f73357a1de04b69cd83c55d)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x250b594aa3f1d8bd275ad9977af356b78a7afac28961e6daaeb5ae8f7e164cfd)
            mstore(mload(add(vk, 0x240)), 0x2f951bc4455cb9a44b396ad823b49253fd97cd81925b98236ade92483d62af66)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0d4c3306ec40d3a909717645a1890df1ca6e32bcff16b45eee5afafda89bbaa0)
            mstore(mload(add(vk, 0x260)), 0x1e94ccb1a4d4ec774f434332d1cc287481169dbe2857990192a486f39f0c0e9b)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x07a68bf9b51b93777d4080af2d6cbbf4c01203728d564532cbedc5747de17499)
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

// Verification Key Hash: 25478cb4b462894ab2cb5b61ab2570624ea43374c913639c807c264134e57783
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
            mstore(mload(add(vk, 0xa0)), 0x20a6f0c3a2e997e8aa17ddc5416eb4861ee66fa265ee81d313edcee727c0ea12)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x07e6f61e44ce09af00a109c6ab5baa30de8711dba5b812ccd110f80a894e225b)
            mstore(mload(add(vk, 0xc0)), 0x20fe91ebcdb769b33feda18718888a69da934b78a6b14de65f2098d6c6f73c61)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0c7d13974cd9076352789ad3ccc0f6c687b34932902c4c16cc7d8020d5e60771)
            mstore(mload(add(vk, 0xe0)), 0x19760cc4b148f8d85df0d0e0391d86ceb31552e1c6dd6714329be829667cc554)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x27e2801be3603fcdf55dcbb759cb7795c792d881801e340dfb569ef9d7fcd233)
            mstore(mload(add(vk, 0x100)), 0x0a6ee3c98112a452f77e9eb231eafe4038d93ae9c235df4514437af06ade498a)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0673e2167929a7bbc194fd57493f59c2ad11dae150ba0738ef3e6dfb13ae416c)
            mstore(mload(add(vk, 0x120)), 0x27203054f7b1cabb330c60dbdef7a55b9aef5cf54172a7f7f30d8082a3bfc47a)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1a2dfc2370e91b7defdf987523f069d3affa446e53e738f44dcccafaa4adc9ff)
            mstore(mload(add(vk, 0x140)), 0x055882f3a401d7b0a21f01f1acb79a9ff278fb67994575891e251673dc6616f6)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x00e405740497b837654ff7be93785a49ace93074b5cb80914aa8106ed32ed639)
            mstore(mload(add(vk, 0x160)), 0x11430106b7fa9f9efe6df83879734e3f911da86b2a10df136b69c1ef6f5ee9df)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x02c5c53f34662499324fb03642426a2636aa164302150bd2ef27bc125eeed135)
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
            mstore(mload(add(vk, 0x220)), 0x12979b2af0e3b4fdd2dc3998f5edadcf99e3ce262c522fd303d8cddc329031b4)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x08268d1504ffbb4bf117384a3c39d69435051f2a8732f546d78f14ce5b550cba)
            mstore(mload(add(vk, 0x240)), 0x210da84da77e13d6a63d02d49f225ada182fe01c0c8300452f34d47af4981e42)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0f5ad837e96a7153929404c294f22c96427e689a2ae987fc5a677488261867e9)
            mstore(mload(add(vk, 0x260)), 0x0e9cd3af88df6ae78aa61f8aeeab224d4cbf147d2e7e230b934054b41a38db09)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1936da2f5fa08b837dfd6b2e2c61544aa4528155a4c05707c990aeda6fc4cd79)
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

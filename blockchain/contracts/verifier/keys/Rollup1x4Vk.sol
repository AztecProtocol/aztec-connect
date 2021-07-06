// Verification Key Hash: 51f0b685f01d8c2cc496af8ed013e880f8989d7279e4f01b2c19ee723e079176
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 96) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1ba99e9b96661bbdf831d2f56a701afbe4dbcdd6d4260b688f997bba0f262e41)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x19fbdd943d8ac03009c30391219597535039ebc784751f3caae995bebef1cdb7)
            mstore(mload(add(vk, 0xc0)), 0x0b532165585782088261783b3ad2b66f34f435b08f0bf9ec06a315104434d80e)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x083b388eaf847f9239ea4788b12b0c69b380ea916f3b63938999375aced0063c)
            mstore(mload(add(vk, 0xe0)), 0x0e4c7eac408aeddb7fb021ec2232c0195e54d307f483bb2bd3adf7fe15a46dee)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x22b911838c72058859e486b46d0cc18c861be9dcf2ed332d7dfbb4357ba3f51c)
            mstore(mload(add(vk, 0x100)), 0x15f38fa93f47885f320a18fc6bdf61c616d1afd91a0a4c36ec39b30059f509cd)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x02b3e7d111583e400717a12acfaba1a87397d64af95492646df422ab00aa0fe2)
            mstore(mload(add(vk, 0x120)), 0x0e5d94a3f3e0407dbac6a6f6cfebceb3175a4ad43c2be2eae577dd565500d1cc)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0625ab11414e1f21ff4b8ebcf18ba77ba8d9edcc95aa44ea0ffe3becd6787ecc)
            mstore(mload(add(vk, 0x140)), 0x245878a8370c13bbfe71198f827e1bfd0acaa668601a5ce7042f954836a5152b)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x25366abcf417365c321256f0b9426306b88b6f0f7a881b1653489d4cf9ff3ffb)
            mstore(mload(add(vk, 0x160)), 0x0fd51b3bb0dde9daba878c0155876efb3bcba72873f2cea21524797993480c65)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2b1eff1e67b6c33f2464e97add59b467024cee126ac4bc81f4459a0a0f1f387a)
            mstore(mload(add(vk, 0x180)), 0x2b5e19657c61123fc0abb94406c2dbaca193639fc58d1c617ab7c541483223d7)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x28354608b8c9b2b3153d4e666b92ec6e75937a2e647c293599cb5b6109709c8e)
            mstore(mload(add(vk, 0x1a0)), 0x18653bd85d5a89f5a9ef091d4fefcc0ebeb4d3f305eeb9cf53ccbac81c2e90c9)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x171d44ea9cc88a5c9bfccf4abbba490c2e42b7ce8b23e1868e9b1527f30df8d9)
            mstore(mload(add(vk, 0x1c0)), 0x1358412c16839dfd3bbd2509708c2f959858b730932d6840a1478394b019fb0f)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2c00c472a30cc9291b295652ac8b4e8f238f26e13c849125f76106f8ef389d10)
            mstore(mload(add(vk, 0x1e0)), 0x159da0fb7f7d342e89d48033d1901c3dad143e3b24d055fdb68a4c69922e01b0)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0a9637cf6200ce8af2d245e4fa9aa910df8b050609da28bb22dca67422212e98)
            mstore(mload(add(vk, 0x200)), 0x115e3d4bdc1c7a5d477b2d800648ff5e83b3058899d1a60a2e78ca902b35cae9)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2a4ae0ae5d08bd487d533f1db942346058cfe0267ede4945b650109c733cebc2)
            mstore(mload(add(vk, 0x220)), 0x1297aac81021a189c7e7f20d07a17f618683ebf04522f5fabad6d768afe819f3)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2b29805841406a89080930d2dbc5eeae92f6533882e1b2013a3e2bfaf1e7d7ba)
            mstore(mload(add(vk, 0x240)), 0x05573b81fd8086e6a17fcf093b6186f622a02fd452760acffffe55ce57c40f61)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2cedea164cc27edb5dbb36890b61a50de2ed9fa159aa97543a1171568116e7ac)
            mstore(mload(add(vk, 0x260)), 0x12df391bf4572f39a5743b00d8a71a87edcf35c5c9bc6af4030ad588fb85e71b)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0da7b839addc330fa78785ed7158725f5756cea52019472824cb85b730d218fc)
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

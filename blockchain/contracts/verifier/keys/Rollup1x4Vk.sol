// Verification Key Hash: aca5a4f09b0a6837f58e78cedb0a3f6a70e0966a612136e54bb772b18bab82fa
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
            mstore(add(vk, 0x20), 88) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x21d6a2768cb6261a7e5c1a52cdd94d66bfed7b5e6adcefa42c196abdd708227f)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x15a190f04e0b6783e760aed47956df43bde2edf35e5de441c39b454f27773d99)
            mstore(mload(add(vk, 0xc0)), 0x1bf2705e67eaf40b7b64797caedef900b1c210030124f298ac37cc161b027a8e)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x07988f74c67aa34aed13cece1382d9b9bd729ee01b793ef1e0cb6932dce32dce)
            mstore(mload(add(vk, 0xe0)), 0x19e17eb285ac9dfd1c9a7cf91f0aaf6115c34d044f89d61dec62521a9d65c42b)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x146fa44e89e958263109158eb735617ea3ffe51ccec44722a6d9a5770ce3df61)
            mstore(mload(add(vk, 0x100)), 0x1fb742229e5218550463179743b9b6271df4c470a7189750f32860e54134bb15)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1d9aa8bf8fba510d72090061311293da6fe028acfb7b1b5050bccf16819615cd)
            mstore(mload(add(vk, 0x120)), 0x03f4da28f6e342bfddf3dd1e51513a0d81638335a4a6debb63b84bdc99428191)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x020cc11dfec8799a338db26a87f56f4ba0bacd0f50a0ada0e92e1b9e26d7e843)
            mstore(mload(add(vk, 0x140)), 0x0454fa00b6f913d75b5d4a4a8516884159333b2d73362de1a8c19a6c53d31838)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x13f77d1817f3d1448e9592ad10ae4feca941ab41eeb057e8ce32818f2362812f)
            mstore(mload(add(vk, 0x160)), 0x10d90ea72ac6814ba9d04980e5548537b0edf739f64a30188ff0ba0da586e697)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2834fa319e7e72200605ca34ceb472fe3a609330713d4ef5816604e112e8ac9f)
            mstore(mload(add(vk, 0x180)), 0x1633cecdc776a5356ce630c1ce8a73e0464b85b43cb2da6be16865513945b9a1)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0364a262359e8db03f1ce7fb91e7adc2281dbbaeb2cf1db47c9ec372f9c308a4)
            mstore(mload(add(vk, 0x1a0)), 0x281c5595b394c4e29b437396cad697e31a82d704b09a30fcb04f4ebd1b4f80da)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x15e9e3535e9643818a76de0d4a7b6d0ee4db4425b341d49784ac83792d940ce5)
            mstore(mload(add(vk, 0x1c0)), 0x203c2082de3d510a09cec483d1bd0707cb0271bc9b4067bca0d3edce890af51f)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x271433a50b24aefed0eece2fcc6b5ec87f48fc32c6f47c936a5458e7993834ca)
            mstore(mload(add(vk, 0x1e0)), 0x1a00b7ad09f747f4e9dda4521c2e28ad707c652886a9f8c22fe5d2ed59e992ba)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x24715d762bc3ff50c44f24302cc3043b4aef56b18db21e23fd0dfabc280995e0)
            mstore(mload(add(vk, 0x200)), 0x24b879a0db330f255f5679137e7dc3053366af34192812b3f93752ce5e1a84c4)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1891b7dd876e233b9314c9fe89526b705ebc4b8f2c5666f0951561633b16d769)
            mstore(mload(add(vk, 0x220)), 0x17faed216c0731309ff125db187e8c5098e3f6b749b4dd7f1ee50451dc0cc07b)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1ca58e1734269d2101887c898f23c715eb94721f178a1e5295244b3723cfa5c3)
            mstore(mload(add(vk, 0x240)), 0x2b4c3965038b4166f6e3a26d3a531c55dcfe3ea68a044bd5fc497d05a9e70c2a)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2fc428387eba4acd59b407feae4748d90c56e36211f8fa11cf551e48cc041f0b)
            mstore(mload(add(vk, 0x260)), 0x1f6b86a76775f69e1dd4e294486f88b449cad3c3f85c6f2da82b151fc73fa0ba)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2d1f4d8356d19a765c251e5a0f68b521d58e510181a1745290bf0e6406eef1f6)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 67) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

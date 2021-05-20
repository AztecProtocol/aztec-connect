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
            mstore(add(vk, 0x20), 94) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x172d7b4771060239d6a8b4fccc718ad242f542080d250b75ef4d8b12aafc8131)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x233885671ece719280215b8b47f8c226c5bf77e7775488dc52f904c7edff7ae4)
            mstore(mload(add(vk, 0xc0)), 0x058b33860709555e7646995175cc83fcb0dac039d0e3b889e930eaf8cda31843)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x13e9d1c7c0f2414fe31a53b32467ad2b7862e661f2bafccbbe862d81abf864c5)
            mstore(mload(add(vk, 0xe0)), 0x18379d552c0a3be8f5e568cca47eaa47ea3d8586536cb2e6ada38ee919e35a83)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2c497504c44ecbffd498416c0549280ed71fe678be73f7825586f3c70b59ea12)
            mstore(mload(add(vk, 0x100)), 0x04bb8079257505baa58413e016ab9b6dc6efa1a8d1e57483d813603a19fb788b)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x242df24a1631b1ac8128614dbe5200eb6d3eab564a3ba52fee450e698bf3fb95)
            mstore(mload(add(vk, 0x120)), 0x0b72c1cf25a4ca8cdf15ca2d8a703f13c7d7207abef8a458cad3208ac9e4e221)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1aa30d7b8f80e5321285adfccd30f10f86da49d727dc249f1eb64c2f603f0f2a)
            mstore(mload(add(vk, 0x140)), 0x082b0f7e3e8d86f759d482324bcd6290e5e9d6b30513563266651056d16bc6f2)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x09c43cbb1b8a0d002d27834ff5e1ca5d76fc9fa955a93d46d772e5e4b5fe65d2)
            mstore(mload(add(vk, 0x160)), 0x034eecbb58043b87e12c301b606e780e00e3a386b482c624ea8212f66d738f29)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x01c7133f20cb40e108a6ddc55435297426f66057e69b6154f187a32e96878ee2)
            mstore(mload(add(vk, 0x180)), 0x234c2c44f0f18d60022ddef66dd8835001c50f2cf5279d1b5a6160dd895e527c)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x082f7815c04f23c2f2e6de9fa4da6ac4f3ed70c8215ce7ad1535d169c2687378)
            mstore(mload(add(vk, 0x1a0)), 0x0b8895bf69fdc9848aaf9b677f8f98702f3a3c54845b5b8dea0f884aa277a32e)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2f16cd1f9ee9154e6e5fdbd98bcbb0a87106c46a7314fd9424d9390274735c31)
            mstore(mload(add(vk, 0x1c0)), 0x031f9bf6e30d25242788ec8469c7f76446ff9fcfc052c4de447ef352ba6113c5)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2498a59a740fd859ffce2267b69f04143cdd80725188ab5c3c0097acba058999)
            mstore(mload(add(vk, 0x1e0)), 0x15cbed2963dc925bb43e457b42048feacb5d72ebfac41a017a57247721a0b8f0)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0f72ce4e0706e69ac2149714c4300837b2ac9e3cf7fb67baab5a541669c7bf43)
            mstore(mload(add(vk, 0x200)), 0x0209f7c9b60b8db2d8f469d057af71f5fbf9835c66d3ebe03ea3f6a1ad1293ee)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x26c3101546108003f422f79229c1191763a8e907e69d60b7c297aa0384d05054)
            mstore(mload(add(vk, 0x220)), 0x28833f6bd7a21fef5a4586bf03983269efeefc4ff7674a927240381c31231510)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1811521d81bf2b89341d3ad2f420a044154586329f946450cb2cc1420f358b89)
            mstore(mload(add(vk, 0x240)), 0x185675dc8d110bf796a7538a30fb667b56a262b1b2bfe00f6a53358274746b7d)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1fb1d9318173e6f1c617c31c34b7c6e080fe98dd18adcc5a14dd71bfac74e663)
            mstore(mload(add(vk, 0x260)), 0x1582721d9cc4260fa6fae33e76ed65b2dc6a43d8e8787113d8bdb250719243d3)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x074f52001b68ff867e025caab87b5cb19aca6b930863658b9af09447cea2f8bc)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 61) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

// Verification Key Hash: b75b7125f628935139381212ab7e02cfb3bfb39d41d7045a6051ccdf79834dc2
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
            mstore(add(vk, 0x20), 68) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1f7a0aa53b100a91458c1491226e3a755301480b194af527b18c1c80e8f000a3)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0f9ece7ad8e80a75b2660b9e9d7fcab083a4c58e39406031cfe7e3d4344d3ad2)
            mstore(mload(add(vk, 0xc0)), 0x2f533e1c06a29325a22c3c6bc132fe77d987ecc3caf6e685d92f2b2ffcab99d6)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2df8a7c63b89f9b2e68eb7980c0e21b7b2ccb5fa184a8bada68abe8344e4a110)
            mstore(mload(add(vk, 0xe0)), 0x1172bbf4b7d41b5d55f0c8bbbd7ee6494653d5f83be2c450c3ff2f390faaa994)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0b6bfe1ef799d1243425e48f519b56bda46cfe7f9b1da3d74977b4a8db18247d)
            mstore(mload(add(vk, 0x100)), 0x0997625e439d0e27a2f150a90070a3ae136d4570b1ac4324e36e43f4b3a3c547)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0d9dd60e3735d69ac64680b1dad3cce1697fde39d2e72d25ae544ff567028709)
            mstore(mload(add(vk, 0x120)), 0x0a6843810eb45356296862081dd3a1ea4157e403f564fad2a12a1353a36676aa)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x2b6d07e8b0eaaeaf51c4c27c2ef23b1e9abdd6a9bfbbac241d8c220ca65fc478)
            mstore(mload(add(vk, 0x140)), 0x0f0fcfb5846f6f0da1357404cafeca9ca811e5ea625b39d7cc58aa36d2fbedb8)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1c49d1ac4b284576ccccbe0af9bcf41b0134b7199bc047f79ca314e463e51f4c)
            mstore(mload(add(vk, 0x160)), 0x176a46b49ed78b7aadb15767e5f83b08c74a26db23504b76f2d5e2dd93b809ba)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2cd6d70c1469726e9eefba36116ec6220302903e27748781ddd77ca3436da972)
            mstore(mload(add(vk, 0x180)), 0x11c83e92e876c497d6e866c3998a375a0fc55b4859e785070daa3ca0aa2329e9)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x277dc32a48f945e60d2d91e22dd9b90e57ca870eb38e1386e3665c7a26298b56)
            mstore(mload(add(vk, 0x1a0)), 0x0645c08e2eb8460415eb3510baf6347eb58fcfb1b101fecdbd971fb88200580f)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x142a42e38a3b828a51f60d6dc41105a06c12f7e3a6276ad31ba80cd934e096a6)
            mstore(mload(add(vk, 0x1c0)), 0x101b53bf3d7c76571d265cbdd93f6901ebfc35ccf3644340889f801f864d216a)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0cc506315c32611225aad8c694494926d06e70c2f54fd8eeda22b3e1d252601b)
            mstore(mload(add(vk, 0x1e0)), 0x113c6f89dfccff7bef7ae4f1de370ab1a9b500763866a70901a7d7ce3b846e64)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x20b3c48eeb45f25b158c5bdc3704eae7087ac70a91f38ddca1b5f0890a7b72f0)
            mstore(mload(add(vk, 0x200)), 0x07c34891ef9b965f7dae61804c59237e81c3de2267038d87554cc98866e12c98)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0168707f7b4ba202d2860129ff4316e126e9d26ee1c6f3cec9b586be795f7613)
            mstore(mload(add(vk, 0x220)), 0x126cb3790600c77f519a4ca55fcb24d5e66bb44c9e9762608112b118e685e969)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x3049adadb3e2897bfc2a4876f7360fbd65eaec078a5afda53a099edf7c9824de)
            mstore(mload(add(vk, 0x240)), 0x20d409cae5a507715e3a279f1dec4461761c1a22dad8e7a3b997b6d05587f5a5)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2b349b03b58d6d97ecb2c285be4fa6a515870334ec3fc20365e106b3bbeaac79)
            mstore(mload(add(vk, 0x260)), 0x274713dbfa2313733df5dba8eff9b13df2241e7aa5503a586fa4dc0eedad61e0)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0babd877a85d789d9b313304caafe6c4fe961a01eb89627fe5e189939dca0821)
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

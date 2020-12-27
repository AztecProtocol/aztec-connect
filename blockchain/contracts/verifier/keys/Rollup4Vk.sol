// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup4Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 74;
    vk.work_root = PairingsBn254.new_fr(
      0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x2b136e601e0b5962bbe1c34b84a9a3910ce4b23a896d8df0368594fc43c4632c,
      0x27406694c66637fdaee31c815512399ab324f59eef68aaaaa59a923ea7e022cb
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2c4dda4ce6b7d0d3fa8df2e98ed92af0c9dedeb265d7b2574ce48e91f36f5ade,
      0x22b2fe11bf31bbabb44914391814b6928374ceeda0b2295e59116cd037f6d1c2
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0006bfda02963e867ed260a226837c9a847350c85e83a8917472edbba158b15b,
      0x198504b101c0fe99ef52b559256795ebf027388f4ff3e241ce6df2fd556c27c9
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x139352e82d38e5329a0e3aaa1de8a95460b1ed69c336b4d7b48b55f17a8541b2,
      0x158794e1720321e3ecd7646a8a71e4ac578bd06ffba0aa3cb35a1df4200d637b
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1d56d56e5e02b926f8a4b6117901e0692fc61d861aa2a9872c826e1548f1c09d,
      0x086d0c9eee018de36605662ed3a3ceb4489c726ff50f3c3d625cb87265abc5c8
    );
    vk.QM = PairingsBn254.new_g1(
      0x250a5cd6c2fdfd43c590b6971f381abcc7cbaef6369b3c403a271edddde698ab,
      0x0b7816494241bca1df99d51b48a6cd22b9fd6f31f04670d44a0b7e438af58bdb
    );
    vk.QC = PairingsBn254.new_g1(
      0x2d2739a37ab6602d90316812e331f403ced4bdb14c4f7740314c4934573efbf1,
      0x27ecb851d793b526d44df8154a97d0beea82d97bdd55756334304056b82049c3
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x255c6b5e674eb1df9216caefe9b00452f7a065a94cafa64cf29ac8bf07aa5d47,
      0x1b9305e043d2221711b030fbe47d9b3303c7e88e9301454679a59ee6c48a179e
    );
    vk.QECC = PairingsBn254.new_g1(
      0x036faff77a04ff59245306b3d81de8d0129ffc0ee029c63805d7cc0ebb2ddbd4,
      0x210f7656bee95baad7b91e675416afad6b8024dbf226d792e2ae725c7437483e
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x00ca446e75dfd66872a53aff1b4b0ee431c7aabd68216d481ffe0c4ecf228f34,
      0x1711da4542b3e4ff625a9db68c97ffdaf313a6050645d9857af978bbedcffbf1
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x23490215bb87e2c612ac00551764d30dabbcc4d5e1575fc508f6a3e9b6bc99c4,
      0x0b972c672e00c0812f49506d091d7a3c448838828894e5c7b0a424b4c40137c1
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x18f0393a5f8e51b632fc45e71825308f569bf8f39368407a44632c49bb34f548,
      0x24382194bc99ad6dddc4aa6f10dfa53591e893692d17849c4cb7cbfaee0fdab9
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0b9cba38b6ad0086073b686a27d7e33eb47db14a2bd0a18213fc4a96f3b715df,
      0x02f04cec06c9b6da22d3ecbb61b5310687b6a569ce40af196c13a18bbaf3fa6a
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x14e4ce00956ba8df0fcc16d6c4cc2da52d266f669313e1ce7937d1de9305d635,
      0x176eed9f7700b8027ff33194719fa3fd66a88d7338c29b87929f9bb5d8c2496c
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0283ab27c8c15be9fd431adbb376f647c160218b35b7a811f0c6483e203d9ffb,
      0x2deb80c08cb602e4ad9dadae6af769fce5d20cd4734c40ceea9d764d9695b4d9
    );
    vk.permutation_non_residues[0] = PairingsBn254.new_fr(
      0x0000000000000000000000000000000000000000000000000000000000000005
    );
    vk.permutation_non_residues[1] = PairingsBn254.new_fr(
      0x0000000000000000000000000000000000000000000000000000000000000006
    );
    vk.permutation_non_residues[2] = PairingsBn254.new_fr(
      0x0000000000000000000000000000000000000000000000000000000000000007
    );
    vk.contains_recursive_proof = true;
    vk.recursive_proof_indices[0] = 58;
    vk.recursive_proof_indices[1] = 59;
    vk.recursive_proof_indices[2] = 60;
    vk.recursive_proof_indices[3] = 61;
    vk.recursive_proof_indices[4] = 62;
    vk.recursive_proof_indices[5] = 63;
    vk.recursive_proof_indices[6] = 64;
    vk.recursive_proof_indices[7] = 65;
    vk.recursive_proof_indices[8] = 66;
    vk.recursive_proof_indices[9] = 67;
    vk.recursive_proof_indices[10] = 68;
    vk.recursive_proof_indices[11] = 69;
    vk.recursive_proof_indices[12] = 70;
    vk.recursive_proof_indices[13] = 71;
    vk.recursive_proof_indices[14] = 72;
    vk.recursive_proof_indices[15] = 73;
    vk.g2_x = PairingsBn254.new_g2([
      0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1,
      0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0
    ],[
      0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4,
      0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55
    ]);
    return vk;
  }
}

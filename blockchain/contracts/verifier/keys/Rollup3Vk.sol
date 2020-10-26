// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup3Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 62;
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
      0x24e0ce813760356289c506cbf0627f16817e90e0b3ccda6ff98d98fe62e58cd4,
      0x23ae85ef0c146c3766e6a8d8537eec4ce1f54dd973960a7b36fafc86425791b2
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x076a3b423d3009d9a840d8abc9abd877c398fa723a98f8e2427f2a834957882d,
      0x2401511e3e44ad76b919d8123c08dc5613bf0ebcfef351d57e63ad5cf70129a4
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x25cb82600a052db7039259abadc0324482c5d6474dc89db1d9833e9f10d25782,
      0x1764346c3fa4c6dd734ac8c3b11d226b859f52678ac44d1a02ae0885bb4ae7c0
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2f00f8a7f3b5849542018b6ec0b7d1d800198630d93de34bca1faccc4286e543,
      0x2f081f029e9076282a83ce93c1ad11021e653df04cbe557713ef5f60c2d65bfa
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2f14ee45020bbe41166c90a210362c26a002e1cbcbfc9a02bee4fc22a46d4d9e,
      0x2b8bc9ee29d4bf9e16bc18b00bd21899b0613d2abca7f7e00985a98f956cbada
    );
    vk.QM = PairingsBn254.new_g1(
      0x0c790cf8c30a859775c003c386299e7d3ccb8ca1d173b1cfa6e72bf66b0860b2,
      0x026227fb5ae73c13b60d4883f948c74a2d9dc6153084e109178929c195a66fe9
    );
    vk.QC = PairingsBn254.new_g1(
      0x21d6262bc767e9024bca56a94d525a267d10d10d928ed98e1205b49242dfd05c,
      0x0c9c5fb438f82e547fcc938c1f5b626459e658dc1f36c58d2b85f480c2f39108
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x1edc08974c3aedf969e09d01dd800a3a2a010e9a6863360b0df54a361ef914b5,
      0x0a73f7ac36e80bacff37645c4145874c606f665c03b234c276340649a6e5c8f4
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1e9d8ad0b2cb9382dc237d8f72c9d9ce9871a629bd426fc749447503d3ef6c65,
      0x300b2c812a22eae6fcab7b367b8e1d4ff04375983269b29f5512f95332b1e71e
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0ed5a2387fda4b3668108bdc9f4057b847678c6114a439b9aeb4f1d945f7a8c1,
      0x09df7df89031299fbed1e01908b6327286e2115bfb7b0521dd802dd8745ee6cd
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1487819139ff478c72adde6f563b3e39ced7eb51d62d42aeba96709d4b403284,
      0x303b75c81f6dee1d066f63ef6b0d363772209407862b3f657ca095c481121178
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0157edc6fca81b577dac67f5f3cb01f324b80232283b893f08acab95bfedbeae,
      0x2194ab01099a5e501b58edeefcb7489c12cdb4d62f256f554f5ae947781b8605
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2b8015eeea0051cd5c6c2e326f696f2de39dedec2c15922e0306010398cfdcd2,
      0x24c94ba744bf62a0a8764fddca59cbf3d3e504173c12d74d0bcf70c44a1ced2a
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0d71407832d5c8a07bd2c39b85fa2700a255eaae9cf6644d8e152b07db3dae89,
      0x06b07f9f945b36e1fccc3872f32d60857658307932c7658fe8474f61fd092502
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x29d9f5f29dffc6689837bbe5bd9e405be91eec1741d67fdcc2a9f85d54c34178,
      0x2b1dbf7d77a1a2d8ad159f6acfdc31d27625de11126576c8b4f4f8e3d9233757
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
    vk.recursive_proof_indices[0] = 46;
    vk.recursive_proof_indices[1] = 47;
    vk.recursive_proof_indices[2] = 48;
    vk.recursive_proof_indices[3] = 49;
    vk.recursive_proof_indices[4] = 50;
    vk.recursive_proof_indices[5] = 51;
    vk.recursive_proof_indices[6] = 52;
    vk.recursive_proof_indices[7] = 53;
    vk.recursive_proof_indices[8] = 54;
    vk.recursive_proof_indices[9] = 55;
    vk.recursive_proof_indices[10] = 56;
    vk.recursive_proof_indices[11] = 57;
    vk.recursive_proof_indices[12] = 58;
    vk.recursive_proof_indices[13] = 59;
    vk.recursive_proof_indices[14] = 60;
    vk.recursive_proof_indices[15] = 61;
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

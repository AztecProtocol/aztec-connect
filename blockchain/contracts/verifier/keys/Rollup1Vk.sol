// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 38;
    vk.work_root = PairingsBn254.new_fr(
      0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x1d3a99a67f1eff48cfa3711415800b411caa929b244d3430b435894ee75f0fa8,
      0x203bb28747289fe28888a69dbb5e37b6e91b8c6dd4c7e7751e88c1b7ed8495ed
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x011ff0da86167a35701dcb53a4a83f5cb0c92a2bcd531c3c4a4b53726cc6ee3e,
      0x1cd05e5a12e292e9d7dc05d98aa860c3523aa93b5f5a43b30b8cbbd1cd37849f
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2169105a506e3aba1e4bf4d23f1cd6ee64d332533f406b3667ce65b9e0ba965f,
      0x21645756832c948c22891edf5e9eed43e54f3c2da2ddb2ab2ccbaa4200256b6b
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0015fc8e698cce57223a4c3235e90ee6ba0e935ac8ad89a666832275f5f9e035,
      0x1ddf635ca57dde57ce87295d1160c85b28d33f43e54a5071fbb3a1dbb4487270
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x206c35459889f28e77356f1f8a2a60a2d51a1742b6f1f6114975a313bdfbffc0,
      0x256027797e683045046ae2bd9501f51548498413f19f8ebc73cfa0a84f87c6d4
    );
    vk.QM = PairingsBn254.new_g1(
      0x2759d9b9522ebb5ae2eac48fc4b30773a82e75402b0ea13617a07378701b6986,
      0x2d99f15448c445f69c84a75fe45ecb1b8c243be818e79e1e3d2aff328e5fa52b
    );
    vk.QC = PairingsBn254.new_g1(
      0x1d7d78f84eca81ededf39952951333c3a9edc681d565d54db37bd6b559b85027,
      0x099915fd3faed961dad434100e496a3752e70f2bd0cd18877d69c7fdadac8f9b
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x1ce4d066be04b0b367de53da3daab5f9e82a1bd59ff7a27813ac1eac2e237a8a,
      0x1a41128f5d942153678200634bee947f9b33f0e2532ed0496b22784c1b9f482c
    );
    vk.QECC = PairingsBn254.new_g1(
      0x118390e0a1faa270625a6a9e1914fa4fb6805b5f772cfc4631786e9daa7753b3,
      0x215f4870b56bfd918cda03915263c543046ebce640f85587190680ca98055389
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0b09e4575efdb25c46e8b30d0e88587aaeefccc2547f0e7ef078ae8b562c9a8d,
      0x05b06d658ee562ba2ced25213d57022f8488cddd4a2253df0e6ab43577933fb8
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x03817b62e017b6aa4d54554ad520cc8a15073ba0f050799af8ccccbd0797bf70,
      0x30282daa59ccda115e23e7fecda566b868f0295c22261368a1482e5b93b0dbae
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x009fec779e50b842fbe2a6bd40ce0ca2941c8b79265b91d3a44750c8d8128886,
      0x04344ce9fdda4895634be5e3d97dffac88fdbac88a89c1746d485d6fc7bd21ca
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x29bf38f630a6c6b692ba8d82529dbea3391e8c64bbf9d880026636b8e8cbf91a,
      0x17353b2d236ee31c70843873bce7f6cfecee4b9bb67f939d969588469503c9c0
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0b1d2beaaf1b1169f1af718648d86e04be5dbbb13d6f0cec8d27070e260ee97d,
      0x15ac4ba58b8f7a2d18cd260b16ccc1ecdf1ac2278f63b61f41602c0a5271e0d1
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x160cc373efdb0c42b3b15b7944a460d46500762016f005a21fdf720a9d1fcc26,
      0x2648f6f97570c3410c2726106a8849a1dfc445e1179d8a1b4dab500104a86c0d
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
    vk.recursive_proof_indices[0] = 22;
    vk.recursive_proof_indices[1] = 23;
    vk.recursive_proof_indices[2] = 24;
    vk.recursive_proof_indices[3] = 25;
    vk.recursive_proof_indices[4] = 26;
    vk.recursive_proof_indices[5] = 27;
    vk.recursive_proof_indices[6] = 28;
    vk.recursive_proof_indices[7] = 29;
    vk.recursive_proof_indices[8] = 30;
    vk.recursive_proof_indices[9] = 31;
    vk.recursive_proof_indices[10] = 32;
    vk.recursive_proof_indices[11] = 33;
    vk.recursive_proof_indices[12] = 34;
    vk.recursive_proof_indices[13] = 35;
    vk.recursive_proof_indices[14] = 36;
    vk.recursive_proof_indices[15] = 37;
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

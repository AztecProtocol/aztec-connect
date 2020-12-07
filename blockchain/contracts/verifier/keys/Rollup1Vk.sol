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
      0x1d894872321edfc7ed8af97ba7b3eff272478e7a28b03b1bc65954d03b9e24d3,
      0x2893fcc65ec8971fe469850bfd4b99202ff38ff3b97622289a24f06f2fed54a1
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x12058341d838e532009c9e6272b60dfa0e639d00db4afe94b0de50aa19a80870,
      0x20682cec8a5bddc78b77e040dfa67b1b7dd8a85423e276d3c89ae4210b955489
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2519d26baef8433ce32db61b0ad0a72933e372af79cffca6d9a4d88b95eb66b3,
      0x25fc21e255e65c238104d2e1accd59c4022a3e966840dd14bb321cbe708e4212
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x09cd2308bfb8dcfa607fe627c120d39fdb904c6e88a61ac033bdb0ada43611e6,
      0x20195caa8773647173f8e810af42d6ba571f9ed35e8b13c4bc26de0199ab32ad
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x246ed02e8173262e66dda7cc81293eec776160c6864826939f6aee76b8e46f3c,
      0x141a589117bd07ac0db256ff24970f893f3a778686266b2208563c98aa781943
    );
    vk.QM = PairingsBn254.new_g1(
      0x0372ddf5861c942855422d0d8b7993f14b30a7f2d89cc3624ba8a6f0357b22d1,
      0x2a576303d28d79008042d83ccaaabfd23d85c5ea7da6780d8bc6be04651df2dd
    );
    vk.QC = PairingsBn254.new_g1(
      0x2ca377375dea7f61223b7bd5325d4a0a595a70cc3b8df9f142ca1c693d66db20,
      0x073b2a40e30e65068545f03391107c73fa40042a47046f9299aa9af74f9ebcd0
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2c027b11539dfe71f09e2d3e0f7357581c9d1288bdaa2903ea8b39aa452d6fc3,
      0x03a8bcc5aaadd09030ee24b08902b2fbb699619eaca6913d3b89a6f78b7d5508
    );
    vk.QECC = PairingsBn254.new_g1(
      0x10e551ff2e1a916af8c164b4278c05ffb160c3a64fe753ed480b09a839e8ba5f,
      0x0d94985306ae9ab40b5b50324cbaeba50dda9e14c8d229f8da41c02cb93ce589
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x29c91abef69837fe8751e15625e0703c1b1eea8fed8c7cd8416c1eeeecab9468,
      0x00a782e6f08f354dde59541a20130d1595f03d3b329a1c7027469b83e460872e
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2ccbacba98ad333c966bb5753d527106ad97a716dfaac401dba008d5e187077d,
      0x1e045d993da36a937a43a9cd91455c82f3aa0e58b62fec35f3c5b03dbc8428da
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x107252f6bd93bbcaa5f05c9696a6464b240dddf43d912fe2b6d358be902bf090,
      0x133fd6797216ccab266f2c20b8d942fccbe497848e05c54dbe5148fe6b8860b7
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1c5b02f955ddd579f7b21940cba0abf4f05721ba7f0f0044b759e9f715f261eb,
      0x2015e1dd0f37ce8e685b13013f17b2ee622992c6a29bf94b876dd6297126d1df
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x16d9ee2d3467f33043808d448b998e81064876ce96e8d2bf732b837a1f12604e,
      0x10e4d487616b882aa11d932c5d8f06df4c8912a627a640b5692be946089cf419
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x1b1d27fec6723bb726ed88529f8b821bd4ce45930bb2168d828e4d62640c2be4,
      0x294eca09e1e57ed8d269112a813c72b330020967ac727e7335fb95356c914ff9
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

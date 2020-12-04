// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library EscapeHatchVk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 524288;
    vk.num_inputs = 22;
    vk.work_root = PairingsBn254.new_fr(
      0x2260e724844bca5251829353968e4915305258418357473a5c1d597f613f6cbd
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x3064486657634403844b0eac78ca882cfd284341fcb0615a15cfcd17b14d8201
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x06e402c0a314fb67a15cf806664ae1b722dbc0efe66e6c81d98f9924ca535321
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x0de0702d8e019a3f711ff1f9eb98a941752ceffc5d0486dde7974cca41ea532e,
      0x27fbca8e85f04a844042330e3c51d0ad13487de7374de886a6d1e6a89f634320
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2df5d84da902d3c5720ee3ebd16f8188b2a1e7f68060977aeb60d45fc2054fe3,
      0x08a90c793cc16cac17cc8cd238ccd28c0ccad85b8daa86be2714fe38d3d10f30
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x09cb6106b2785b86d7c831cfcd1b46a8e3d6e213c8fa1e23ed674b08b89dc4ec,
      0x1cc5461d6d06ff58d7bd2f401817866e5388d7286f57cdf0a491c989a406fcde
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1135730ef6b00c6a0aa7f2d89b4874af71939560e6b95cb9178b49c8c375de70,
      0x26bab7947c0f61d0bd73fab050f06a1e38ab41f0d50f99a003fc0e6209115f5d
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x13f8f2deffa50fd156f583c65525acd4eb30a7cc385e56ce048289cb607db7f4,
      0x15bf0740ffbd3d2987925016055c22fdaedcb3bc8cc3d6a952ca59dd9e00600b
    );
    vk.QM = PairingsBn254.new_g1(
      0x0f529b9a7e5702f419a851f9351ce1f73a4e8110330eb105f85a3cfeb2b3f11b,
      0x047db8ceff79b735aa7a26784500445769c86f707b19fe2002b545818ff03736
    );
    vk.QC = PairingsBn254.new_g1(
      0x2af213d33022d9ad0d8a953e43ca461b57944478faf45db6636fcc7ed38425ad,
      0x04dc8ae0069bc61d22fe380b6edb86c10f24b85c20a839559c74d564378cd043
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0a5837c5d7e61041b1de1a93814170904ce948cfdf927633c154067b79f8d900,
      0x0c199af52693014ffd19f2feba0d8bc52c129e66e4b949c01065893a2652c370
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0e40244faa5e2f25b4d3f1419ed0b18a7a13c992acff5b6ff9ac230a8b444c1e,
      0x2f2ce27b38fc7c4d1e7cfb121c7c803b7d9aeb8aaef597d85397edfbf5281544
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2057a6c250953f739fa4b41c45fe7358fbaa7ef7e0800d4dbc56de914d998cb4,
      0x1051b898259fd49f0ab670618c21a0ee8f9e3ec9941de9b04d70fe693bb06f32
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1218060ccf904a4d59ba937bcd38227396e1294baa47f90f7a5c5222f4f58080,
      0x23c1807a26831a8651149c989e7177da7e6c75f970f2d53b2a9e5d7ad6f4df38
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x01db4507ce61efc55b71adfebf114c79fa4b5be77cf24a895e86a133eb705fc4,
      0x2648b130482f8ae10948c4f51aaf891c45f29269c5b0b5ec50fdc1da112e60d5
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x256651174a210cf99835c74c907b6d9cd8cd1c86088d3b844c4a952e477fb254,
      0x1250ff7294c4f41c663d6f1e07296bf3917919bf08b5d2ee6b5ae8bfd5097177
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2cc2bbc1ae1f1fdc3599726cd357dd532c6c6326f969ccbf259d5d4692f07c15,
      0x20295695be79c73a3ee278b5eb66ab30cbea01a344b0c711c6e914a3b169aeff
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2ab188c29172a13f90d0bb4481cbc6d29cdd16cab39515c5b9e98f34dc6c89cc,
      0x1a2cb4739e219e46b66339e398a5d52a2628ae3b71b7b22f5466f38707e74611
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
    vk.contains_recursive_proof = false;
    vk.recursive_proof_indices[0] = 0;
    vk.recursive_proof_indices[1] = 0;
    vk.recursive_proof_indices[2] = 0;
    vk.recursive_proof_indices[3] = 0;
    vk.recursive_proof_indices[4] = 0;
    vk.recursive_proof_indices[5] = 0;
    vk.recursive_proof_indices[6] = 0;
    vk.recursive_proof_indices[7] = 0;
    vk.recursive_proof_indices[8] = 0;
    vk.recursive_proof_indices[9] = 0;
    vk.recursive_proof_indices[10] = 0;
    vk.recursive_proof_indices[11] = 0;
    vk.recursive_proof_indices[12] = 0;
    vk.recursive_proof_indices[13] = 0;
    vk.recursive_proof_indices[14] = 0;
    vk.recursive_proof_indices[15] = 0;
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

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup2Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 50;
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
      0x2eec14e4fd909b69ee106377ac7fb68b6ab234c01f86a72a76209872318c0544,
      0x27010122d567519f38fddfb5564e1ffea460612aede045db24e24d87fdcc28ae
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1bd3d8eaf39ff293277ab74b2a0168ebadd662cc02641b23c66de26d374f1497,
      0x0e541cedd4d503d07d580486a18b8562a0f04c8712085aab75fd1da1e113e5bc
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x038b3029a2c31ad5cdff346263f1c2cf8e93ac94d0184d0879bbd4b556bfd317,
      0x2e52daad618372b019a295ede7df730c0c6da63f4bd7bf56352716773eac5b72
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1a21071a795d19440a9f46a83e8019a2c9a39eb580aa269d74d3d43b08949842,
      0x0e94e8874c2866e8854b5cc3da1457273665582bf7ee7fff2d1a41c3cca59049
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x11e35246b096189241e40de4250112f0d621978a5aa3f7a1262fd4fd81f5a650,
      0x073e749f8554f6ce09b6d64fb2a7358bcc642768298af8984e0d862285e03256
    );
    vk.QM = PairingsBn254.new_g1(
      0x2f7a8d6ad0ecd9c09b8a53ff54a620bda08c98c6666d99685e03d934e9e0b236,
      0x07d703b353d1cece67ef5afe88c44bbe30fad3701df6dcbb9a6cda7c6ac15e10
    );
    vk.QC = PairingsBn254.new_g1(
      0x28fdc1236527802f1e9e08c820952ef47f6aa6412d54fc56148ea0eb84121965,
      0x0ba9e12714208320297f54a8fbbf6311ff975f2353c6e894b54408313289b392
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x04060a9aa5f8e823238ddbf9a116eb8416565aee14c65cd892d114baa8407262,
      0x18da76d4f1965ab511e5a5ee1a93fc69397dd9399546e14f5db0b4b56c46eebe
    );
    vk.QECC = PairingsBn254.new_g1(
      0x080c5b8f634088b57be7b2213e424ae11f2fa75f8fbc858424370225f794f8a9,
      0x20824399ab4932d4753f9f8eaebe3644b7559dbf48861d51c6931c7576f029ba
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0c123105a4f4ce5a8a31878a2124dab5f6b0bc25c32e5af6ce4fa6dc3e87c342,
      0x294d863f3c4a4134e91e73a3b0b0e4624c2d98854d896b0a292196783bc824de
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1d08a6a8be679207e0936113a8b1de4093b3d2ec503d47447b483f62ceef1f84,
      0x2b942a516024a989191e1e837934061b6a606573a6e4bbf32e83f6f0a031f8ab
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x21b497d3819cac6280c588c47460dac5011158f1e15285efa92f78fed0f9d756,
      0x22e8859913e2f9fbf23eeeac607be0841ff668afa901e210864c0d248cfdf181
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x13e37975c0e89b5420d8d2ee115e2847a2c89ce7fe780868d26f592929654202,
      0x1718255e933035e24dab3af8662f10667b284d6094bfa36a4e4cdb994d330b27
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1b0bb0b7a18699f71c7880bc98d779c68528e56bb8d6176570f8282aa896535d,
      0x02353be306c5dd486a46a95f9fde601f93d7f876237bfbadecdf9c4be705ea8c
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x076adc80fd82aa729825566a4a470614234f276bbf135a7aa8f3c9c2c931795c,
      0x065585f7bdb8034eba169c5b45d1c2cc79765f66d8bba699c50f0ab996f508ed
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
    vk.recursive_proof_indices[0] = 34;
    vk.recursive_proof_indices[1] = 35;
    vk.recursive_proof_indices[2] = 36;
    vk.recursive_proof_indices[3] = 37;
    vk.recursive_proof_indices[4] = 38;
    vk.recursive_proof_indices[5] = 39;
    vk.recursive_proof_indices[6] = 40;
    vk.recursive_proof_indices[7] = 41;
    vk.recursive_proof_indices[8] = 42;
    vk.recursive_proof_indices[9] = 43;
    vk.recursive_proof_indices[10] = 44;
    vk.recursive_proof_indices[11] = 45;
    vk.recursive_proof_indices[12] = 46;
    vk.recursive_proof_indices[13] = 47;
    vk.recursive_proof_indices[14] = 48;
    vk.recursive_proof_indices[15] = 49;
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

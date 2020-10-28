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
      0x1b9d6766bdcc433917e93b1f77d8287929ef529d89841ea8714e1cec4069d7fe,
      0x0e840fd87403684d173d86d39438d206a8591e2c8649b4294f91fe71723d18b6
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0633103b1287358e473a5b0c8bfc9f7f7c31e8c7fa491b026e5f97bd8651e682,
      0x1cf1836528683d32e1ea6b61d7675010991eb42288ff25f1d2391526a967ddc1
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2e75de76cf6f80548b3f4390535b71eb510332d7a05396a9fa8de4c0654d30a0,
      0x0a9a137c3303bf5e1b6a71c2a41c4dc8dc96612b9b45c3e6fa9204e965340783
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x20ddb2635f65be5b5320e5fcc689b00009cf6b3836c01d5ce33afbe80c4e5d68,
      0x28c08a5735f13e1602d0abe1e7322b839b640966596baa64e32287346fb2c1e0
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x22ae1c354375b579c3d4cff3c72f9929cc9388ab504ffbadc19dfd6857a6b136,
      0x09a1b9d7d7f9048f30980f9b0529515c65fd9352cf5e20b6dce724cccc56e2c1
    );
    vk.QM = PairingsBn254.new_g1(
      0x029229f95980d74cfd2d1087ddd0787cb085416e430eb681767c379d30acc535,
      0x205f537d5a19582611915c51c621fb17b04b774209f1e7af2c11e669ce9abc18
    );
    vk.QC = PairingsBn254.new_g1(
      0x15179d303e77a651458b190adcd30b2ba46a9a826ec61e499a30982354649a8f,
      0x0b6805d7b3e98f840d24de9cf2e5fbb0676a52c995c3b381db73ae1fff6f9659
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2a988891486e93c99181b34ddc08e18cd80435240b411d061875a336a05f1681,
      0x077780691bb2804ec56762371e726f76447c17c63e010f3bdad72a4105a02eef
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1735200466b4312724d2fa9caa8b34a147e2ac43eb1a4f0a606da62e8d747d5f,
      0x007da7514e5015e6fc005f8f9271931215b167ee4a75ca8ca84b3e7b62e3ba0c
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1d5c1a8a5b163f1f68afe09f1c3517502c03aa9bcc28bab6a7186c7232782608,
      0x270bd5d0daed6c8b596bc7e10f921839a12a8855982196627d14a01e0d893a4a
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x108c6d7462c942067d7d7fb31753b59e1c987f1e44e54450bc4dae7c64108920,
      0x0cd8773844976f54bd8671a883737d880dc74eaf7e48c44d44e5cb6a7c892589
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0f2e166c65eb7d42b59961ae3452b9a105809438fb531e213dcb31e53d050127,
      0x0ebf13db5db7767e7688079cada96e9b61694530ce4ac92a2bd1d710a0173ace
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x07e2774b1393a48fe84e023df3b61c67190780a8ff70d20966c88585594ad4ca,
      0x25ae76fa5492d641f693dfb68b4eaa79899b30e4f4c9debd5bd4e2eb31b562e6
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2cfa332eb48a1b527c219779fe91889e75450141f1871a541bca5b04d8c71257,
      0x0d8e35554762c74815ecfcd7eb15208f7b8423031dfa8324abc7861a20ed8787
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x091d35c47b298a9a31e9763b9c2af026662156b75c9ea1dcf20d9bc39129d8a9,
      0x1462caac8208211eeb7192c0c3af182af82fc45bc5710a2cd681c9f55cfd2f3f
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

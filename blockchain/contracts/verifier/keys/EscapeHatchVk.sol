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
    vk.num_inputs = 23;
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
      0x09647c3490cd58c7446a81707b9185372878e1aeb406f6e2702c33e3ae11fdd9,
      0x12fe1c52d1489ee5324821a8184d79c20805843bc5023b72508b67d3372f84aa
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x19d0e87572f5033f4fe4c7a3c6deb637b0c701d9b50234a58cad227138fb7144,
      0x20285c81d26be5bcb4ce7262c8d8d1f340ea22abcdd21695d4e123a4fefb4ff3
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0fd0dff3dc017c80d9865a35cafd459b832b3dd55085e0f6e06c5a19ab398498,
      0x180c3a0759b49239eb961601b6b79c55f8c07e7dd57be585c9152119d5bed15d
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x171ce79219558a7251785d741fc89b176062b027b90a8da01b02f3142e6ccfd4,
      0x220f8efcbd2b697a6235ea537114af9600731fbc0a4ae274ec2e29b98406d3cd
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1c186e2938a9625914a64a39b81a9d12b69422a8b59e41fcc5a005603550da0f,
      0x116e405e9913a6ca1a7dc133bbe6f20dd8d3d5aaba4f6b64d475366e81b935f9
    );
    vk.QM = PairingsBn254.new_g1(
      0x19368275f3b2db522553fde367fa346b834e52cc828da4f69b6192783b4672e8,
      0x25ec1370ab62880f1b0fbd4dddcd085fa80c771f49295b4a8fabf2c4b035f5ee
    );
    vk.QC = PairingsBn254.new_g1(
      0x0561ad98693b7674ff760056b431aa462604cd321c4e6c983ecff13844b1743e,
      0x0a62ed2d561bfda38ed0bb2d31b35796f18dcf27f17bd98450652dd971c45205
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x27b14d62b9f43b0c92cee5b08760fede0d59bf221a895f50d0f7af30117f564c,
      0x28f0babfbafe60151ccf3b47e835c6f3d33d1828bf6e4d642346ea948fc9fe99
    );
    vk.QECC = PairingsBn254.new_g1(
      0x253a23a4a93fc2583bd608389066b0c01e8fae73d0cd5e0dda46af7c0e05057e,
      0x22a6af9a36612902ff841f7c1b94789c23fc3b52d8cb0207b5fcbd2db7b87bcb
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x24e5de650ba9375c6d25581c0df02939777ca6ad2ec2852edf53419aec5fe106,
      0x0adfaa33a101721f26dd5b96b97a9d791ae9ff78b3b1d0e3ec79d8a326d3331e
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x134fb3e424c7005818540007f6cd8df8228da9bf35094ed517b791dd770f6d05,
      0x24c6e956883b24f8b573a943208caa50a45950d962afec9ac1c2b9cb067b75b5
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0b29ef23a6534f4b8067f7f30090a46a31c5407040039caf13bddac10bbd5417,
      0x1f950ec8bf8e159c72a591acf627ac254d511c39bc8b26d3e4ed08fdeaabe120
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0c530e2171f46332048dfa42da4da35dc0f24028527f05153a8dc3f4d58071d7,
      0x1ccea2282051d361784184b3e24b8ecaacd97b271aa66cc48436575439d7ab17
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2cc308e88ea780b5b3d9fcfe84bd2a7aeafb67640eb4acfc0be6d8df8e7718ee,
      0x08b53223e58d5a934ef0d65161e98102183c1368238057982339c25d4646400a
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x10d5bbd7a35b2658115190ec7c6c9a36530fb9819e996ab98938d6d2ffe82e0b,
      0x0b13b90ce1a9583ab40b107f402daa7d96a9b363e5147066c1d52c73211f615a
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

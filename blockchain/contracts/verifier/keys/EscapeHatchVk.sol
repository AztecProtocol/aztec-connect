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
      0x11288e8a4f2faccf10831f73a852f918cdbb076247ba0d70bb572768085b7610,
      0x0b3ed2d092f2bcbd8690f9efc44b5c95fe0dedab1fe6105ff84d50f8b63db36a
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x285f690686ddda92bbb1d7c46d132bcd6a52f14b0b2884a644f9e178a2b46075,
      0x227ccaef5a86b18b0d24747b14cd9beb6538d13da51391508186058a902facd4
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x190256013050479a898f1145bfeb01dc25a81905f1d8b204bec4c84de7106ea0,
      0x0e650aa516abf0da57ed03edae480e2d1f1cdc41255df7a5d60e89006c26743b
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2457fc52f7d2ed73d54934710e0d59d5b73f4f90ff10fdae5f385cfa0e876150,
      0x0f0d7f12db61e4df97d64d03018e7b02a74f04046140b424fe7c7b23c9370528
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x037330fa8827746e70c4c5487c3cd8dc1b713bbfd3bb547de5eef21e0d20cea6,
      0x21751a7e3b701e8461973a18d77c6a5cbd6f119d72e072f95144b89661171aa1
    );
    vk.QM = PairingsBn254.new_g1(
      0x1d73d2611ec6ba2a70d529dade24e3bf75f9183bb85b72dcc95d2aeb6fa3eaa7,
      0x2644eee8fe5bd310edbff0b3f28ecd75c5d11039dbfc084d8c475723d477518b
    );
    vk.QC = PairingsBn254.new_g1(
      0x2f8f57a47629d52dfc1cb23a09e765adde84dee8b96109fd1ee2133fc1fbf041,
      0x28d3d3e6c5136debf5387fb952d03df5c7f3871e2ff2c0ec3f40dd1fa642c0bc
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2d1aad7c50b2014d93bec76bff7966c2c0496fdb360351326f6791b6a3806e78,
      0x046c8fac5be115ed93ec623966e29df455d2dbeb43c36a81c01dc0fe8a75e405
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1df78ab178036a3a61fb6fb40d9bdca63a07dd43d68fa949b869ac78502129ea,
      0x28e5dea14a04de002f305018c8588f2448b11be23a2632f1d9cc69b9c1e6a115
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x233b7e268c285c959d603f1179783692a9c134f6eaa91362f9c4d764a9ea5414,
      0x2fcf9b865cac068c52d266951e3dc665ee61a114f84350db4c5ccf9f1f65ef8b
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x047fef588cd8fd9c72505d03de9854a38b34d8e6599aedbbb47262378dda656b,
      0x1d6a2276e98f9a22be8dfdec8b90c49d77352dc455e45f6c9a69c0486025b115
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x003e5bf6634e70c73b99834499cd09b1039477428bc8a0f6e65020481f74d0a5,
      0x27c9cb8a82be2a23f392eefb2ec6b444fd3db28de4e8f7231a409311d4b2e1c7
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x18f574094e8c5df74dcc06239ed90269b1ed2cf9c652e299259919088bc28cc1,
      0x0c594cb2889624dbc57d40dd986561d75222a93f0f12aa2dfb14883df5464023
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1022682ca61535800c8be3b511cfe0063d3dca08bcf5f0276b5fa700ccbb4a51,
      0x030fe8ac720677dae50cfbe69144b0367a87a2c9f584ca77af8b52a35b4ec826
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0704420d6551be7fceb25c36362076dbac72ac1744ae94b7901ad37a8ae70eec,
      0x253acca887e1b84a15ade29f9d45a0931700ecad773d28d9cef9593267bc3b6f
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

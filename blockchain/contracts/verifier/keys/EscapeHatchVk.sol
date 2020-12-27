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
      0x1aa80839726df67b48ed4c49ce10e1f90e9840042ef253e2f3058dd6167c8fa8,
      0x127624cfc626aa580695d8048655cc94374e0bef5471c27c9996ddde1ac78c8f
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x189e803f5765c750b1586fb0301dd06d42a38992c6fcdafbcd54d7e163b382bd,
      0x273e5f60706c56484c795d10245d7a06e351d155b9e1092df6a4a2d717cb7070
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2b8c8489a472f2785786e29508088273119ea5baab9dbf235b0a9475785b5143,
      0x302833a5ea848105a56dd82a042f965e457456f2ecbd02958d2be51992d2b11d
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1e64ccc741cea6c36249aa36b9c194caf400471188b75c3bce3e31aa3456c1b1,
      0x00f32d7a935abca30a41d0d2c6c3e6406a82db30065d1fbb736eb5630f307af5
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x00db33d0e084055f88650141e99d1dc3ac92dfb5fdba3a325487595076b7d9db,
      0x18b726a6a856a1a845e4749ef3b0834a75899bffdb141252740387285cd5769d
    );
    vk.QM = PairingsBn254.new_g1(
      0x07119712de6fb5b6a731cab4c5fffaa1effd1476ee887d1f03b7aa9406033de4,
      0x23c96c935c3de4a4aa668e2680e91de60c9a6706d7e4f4f4c8f0d5a1fdd15c58
    );
    vk.QC = PairingsBn254.new_g1(
      0x231f533f322f6f33df38640b255037e2a4f89b9580519274aabc3df34e17c589,
      0x1fcc220ee2b04c2b52b8f05442940403bf6c1fbf0e6cb8ae86b71b393b60dad0
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x1c796f61b4cfcf8f3f98b3fc8a8cb04bef6ed506ca097052fa69be0b10192396,
      0x2566415d820f22a3a73b3ced0f9bede812d932865d759716ccdfb57861b81a44
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1f5e64706dd493a46ef9e8761f28627889b8e5ca0b209db1411de81dc834af13,
      0x011c843bf0206daff233a6bb33c09a03a7e38823127ffe7463157808d46d955f
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2268d97a46b4a6a893269670c0d58c1eb2c982e8981c545fd1e5b46823ffbe46,
      0x2e10f3793b402da3450a06fcc4b070dd42ad24a9bd1c71d256a116fff43af02b
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x00f02c0791657ca430edcaa49130e0792c8d17d41a7e780deb503ce2d52444ac,
      0x1439fe7bd6b28192b7d417bdc06af23dcea657b29fcb1ad6dee8540ca62c7e2f
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0ae5c5fd86227fbc4d9af320eeadc87f5949569e96580933e88a1e87560b0472,
      0x0518d93081d822bf4e5ab543875f50343d36333a05f62d85bcded9aeaabe0d46
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1cb83d51fccca2d5c612148786820f02268e6762ae7aa1bd530db697df873808,
      0x0f30d3b44944360ee6a3a40352d702acc49167a023f6a2737ed5def13071da1e
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0161c031b9cec8d9ea46e53ac976f4d4c91b36ee31d9c6d4b649e0ccccfd852f,
      0x014eee326a8bf777f3a030131bfecc98f199bad54cf8212f46879e38492e8666
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x29865a7d4d67cf85068e63a341936aa86bc2c77a1dfbc509f983c58feed8a15b,
      0x24b167409c5a108d0f07c3309d14e3b15bb32441e78f24d1ab896116589526e9
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

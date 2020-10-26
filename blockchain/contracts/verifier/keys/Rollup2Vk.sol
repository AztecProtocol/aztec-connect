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
      0x26208a7b9c76566c57f0eff46a7aa060b93a3cde3e065a2ab10d65eec600ebc1,
      0x05ec9a1fcacfbc2d1e073519971d9296d2685f6033a0cc20a96c50c53098c25f
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x266b2550869b1914b753f3d1b9adff10935c9e54f11ac0c5cb35ec1b412b5153,
      0x2a5f312840876dfc2a75c20494feebfb97c469d37055ef29d85b976d316a7156
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x26632a841928427643a6e6d1b03e65cbd7ad0617d4f586677de063ebbc916a11,
      0x2b6c4ec92b7fb1d9dd92bd433c41eefe1dd58fede3da24a5a6178178150dd0ae
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1b12d57f193acfba9d718e926c1a8e598d8818372c901d09cc33bd86988cfab8,
      0x1de7e611557aee4393337405c89765ccb44ff54fdf84f9c6daa1cd383e66c395
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1e1af391e358bfc770b8f046f57c6c6fcb02a9ff7040ac4c717d14a51593b030,
      0x1011297a72f5d96d9ea43e95d27d61c3327f207f435447e8b53bc21ccfdf84ff
    );
    vk.QM = PairingsBn254.new_g1(
      0x1f1300e941b038e76d934e31bcb1f7dbabb001590d1ca0669905e08df0e00551,
      0x27097c737f8520c3bfe404658f0c6c231f2e9cf9d6cf6a462036c99f38f424e5
    );
    vk.QC = PairingsBn254.new_g1(
      0x21f920a3ed7ddf8ec85a406b114740e6052374b779121336a8ada248f7758590,
      0x1adac93bee3d237e8ffeb470895bea46d2f2f257d90b54d72236fdb15bef4938
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x05e852e03f72375de0caa6d6f80d730b56887d3e666f1a280f24b4d88679cbf8,
      0x1e9eb5ce1e076a11c244e386b20906819ed74e0132240114950ca7148efb0084
    );
    vk.QECC = PairingsBn254.new_g1(
      0x019f1979be7788e630cb70763204d764e15fc0a3014edd22149eb4f72e761a66,
      0x1748c39cb564a932869b1724be08bce5f98cd18cc7de6fd4caaad27be6f9787c
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x199e5ddc32242acfe8ee300e7c228f35ce9cf3fb6ec584637c154c86aa719cc8,
      0x247c7ba31df6e6a7df023871dba2d5d7ab2dffa2fb6d421c122b70c3dfe37584
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1f756fb306e2f1bf7f52a0be6d491d4a9d85baacbaf4398c4f532b02030ae84e,
      0x1cae412ba937fe864c7908f91323f503af85200419836807b113d57388f67fd5
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x168d6376e717a0379ce08bea3b26461f4040434fcce61b9e9cb23c3eb13abbdf,
      0x301e898e0c12ab9c58c80e3ab695631154ea9acecc69f8b8adb798cd846ffe5c
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1eb28fd422914b7e9e8d02a49da34705d805fcfe90db03d02bb490adcc61a533,
      0x13d99540c8cbb3f489efdf0baf9dcc47a2ed602e46950f46fe3187a081df09c5
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x094de537d145735e64fbfef30e3996cea6da6416940cda0c90e31306a81b6b26,
      0x23ef18aed8642a3cbd5422881a8e522f6bb6ea47d1ba68b331e35feeae410a0c
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x25350e0e3ee3c291e825f4f9977b2f9322202d45adbe483fe143028cd7f688e5,
      0x075cbee3bec4f17239afff3a94799df15c8784eb93dc2839aebdf77e04e96887
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

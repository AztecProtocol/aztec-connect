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
      0x18ecdd64590a4624a99d31736eb7a63fbbbdf804cc1cf66a1d69ab677a2e4509,
      0x071a4a6c5acff9aea366f24254baabaecab8872153aa2898f7f5e2abee18dd86
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x13d4a61ef4e234f680fe03f5137c2577787584f2954a27b2d727463e3990e1e0,
      0x285485e85a2f813e3a692946f1cf0cbba28623ffe0830df942f8a93991a3c8e4
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x229f5defd1eece4cf021e1fde3c779de16dc3457e1daeb0e4d48c94527548c12,
      0x283724fb2113457f48d225e92f09a14658c65af81c036f04379f12bd69a313aa
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x07d6070fda32287332752b71fc124ba40a9eef4960f881fc05b9d939880fd413,
      0x0293fa193a70c0bf75b71824f8fff21f71d96649b17f09080642db73f751a19b
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1185848719d8b64c636c638ef009fa25cb7ab958582a1ec7972f5810487cad2c,
      0x0b1a86151d5b8882136232be2e207400af11730a71b21b7df7838a3924d39325
    );
    vk.QM = PairingsBn254.new_g1(
      0x20454c93ed5c699f191ff86c41504f332dfb90a989ea421241fd59692c512783,
      0x29ed63fe383ce21a06efb818027208e854383c25f306fb8776f70ec0572a93f8
    );
    vk.QC = PairingsBn254.new_g1(
      0x0effc2e42c275696a2917004feec64d3948f81a4a54dd3f9e0e06a6083371200,
      0x126d80ffbf0a2308369d2c976183064bf2967d983b7416cb84efe013ee42e13b
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0fd943ff2eda1567585f5db711ff273e44dc276b9ac03f6f68d263f050acf404,
      0x058ef254acd7aed38bb5ff15cd8d1ad927efb02d26642b6d1e9e9cf530c5071d
    );
    vk.QECC = PairingsBn254.new_g1(
      0x24b418f70f63cbd986330990eec6aaf2715a0d228653c213b1106da34f4ebeb0,
      0x258337502baf9c7723e8b58aaf52788267946ef593fe6aa268b991294b9c782d
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x19779baa4e92dc9fa1768e9201f21442f2b012c4b8e7d371435fa180821ae1fc,
      0x07770e3e75d844449f2ab9acd1e42086945abb1e6f97f1f69e750c03c9b0a87a
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x28a3f60b6add8ef22b1bfa68a2d66e429c037bfd54c48091ac3c7c8db9ccdd3c,
      0x05a338910941492eb0d332fc5210645f61814d3e20a37c8f83906354ffbe5800
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2b7333799bf4be7816fd241aa031703f55108b377753569d213dd25bdf18222c,
      0x27506e91bc8f26cdaeba009e5ccb3256ca0029f9cbb136e6581ead013e3e48b4
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2586ec2bbbc23410fb3ca6acbc7a36dd60b449507a66f1f8cf16f759dfc4c8e8,
      0x1e8ae3c13bca7c8d9429627978cb0b3a4b9df99290d48a7bae3a860b9dcdddac
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x203f44551eb88f7dd0661ec586d90225181cde4c7f7b99c611ca2aaecb511c23,
      0x020cf3f628fe447c65ffa397a524f55bba05ce18d0975333ffcc3e569c2d6588
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0cb5baea16a8089232f5906ff1ae1fb227c6798d311079981c7db01a85168dee,
      0x1adb6e678bcdbf6795bb11f8fcdbd904f5a256fad94c78878bb4fe42828bb040
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

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x2Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 24606;
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
      0x01173af2fb3abfd3750373c122315fff65c16a161d8aa367d169b94e70ebeca2,
      0x15a7428e93a1512676e560f2e1b0fba4954ca17cb5a6258f1db90bf8ea02f05c
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2a5cf7fdba0796f4630fd70b9e88247ec44c0ec66180e79db32093c62cf5bbdd,
      0x1313e108cb8f5a4338f78695d6a3e49686c1c3a0a54080c4f6280169c54ff305
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x26bd33120d1b7d5d7df2d500c22c7215b1c562ae5da59cbd54831608297063d8,
      0x00f4104ed6f19f1bdd7e333f7daeec24e0ee3e814f527008c9bdd0b9d0cce937
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0532eae9dd38c7a2637a0621447c4def66bc9f8bcf9db1f1498e6a7b2a02ea4b,
      0x283e1afb577b8ad2b9c9693661e772ff0ac75999b5c57883d19a6fb3dc543f58
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x10ecaaa90a50bdabff6ad0952b70b351a38efda6794e442727a6af64a9ca8c0a,
      0x1ae422459dd54816f3a7a1e670689c62b516c2f851a24340db6bfbd9fe135fc3
    );
    vk.QM = PairingsBn254.new_g1(
      0x2ca3e941cf435800b69965c2daa8eb5804b8758235f9ffd2db9dd8cfc73281e3,
      0x261f8d67e42ad6136715f58c62ccfe6744d6f0636db3fdad9433eea76e566a2e
    );
    vk.QC = PairingsBn254.new_g1(
      0x10dae28895bac63324c7762c0190da5e25dc9f4c11238a8f183c36f6f31ff3f6,
      0x1ea14901f47f2ab8e2d236252aafc60228364fe014afa7e5489c4388660d63a2
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x179cd743c99510a0714e36d4c5aa81303094a6e5161abb4c416ab13670a9a2da,
      0x11b73616b5bc4ebdfe69073865805af03f86ee3f063de2da2fd17dec2093c5ad
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0ea4b93ba8bcef19856a38b5e2eb206a2cdf27ebec163d79a58a1e4fd8a42a29,
      0x21d08c4eb61eb71222c35283ba98c845e25600488309d293f11ace5b9a16b6f7
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0d1a0a63c9e384869eb4533c0d34d532b29f617e544afb52ded3afb19191e947,
      0x2c45f4603748a12ccdd581dc0acf3f121e0d1552ba96f31f9f80cb2fa00426f2
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x09ebb2481d7ab6b0d0c586fb7ec6632b359d0e4aa71d7eddd951f2424d70a579,
      0x206c883dfa8b686cf350d03ed208b29b788b92a17ecf9ea2735e598e52b0ed7e
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0ac412c5375fe5fa373f108d71c39a7f6d43ca860eb9578cd349b06ab84f3aa5,
      0x032579bf45f25db07b51cc6ccaef1cb4c37fc781e42801883c4d42a67822323f
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x19445a8494c80863495997682e2cafac5daee5da90ffd0a481feffd4585e1024,
      0x066b2eb89b4873b942030298f13e26631fb72cba6c1cf7ddddbb4657217d939e
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x15f80aa9e640724afa2b3039fec42dc0e1c22b5d68858ec72a500a9660f6973f,
      0x235e5b8f120b5f73ae5dd3ecd17a0c3e000009c4a4b4f052c1be0082a68c9e61
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2727e31dece743a3a1c96443460dab5f93a042f0215cbf2c439bea0f7c6a7ad3,
      0x2b6d0789dcdf55af2dd54106a4ed2b2b325ad94b904856c433395db3c0a223ed
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
    vk.recursive_proof_indices[0] = 24590;
    vk.recursive_proof_indices[1] = 24591;
    vk.recursive_proof_indices[2] = 24592;
    vk.recursive_proof_indices[3] = 24593;
    vk.recursive_proof_indices[4] = 24594;
    vk.recursive_proof_indices[5] = 24595;
    vk.recursive_proof_indices[6] = 24596;
    vk.recursive_proof_indices[7] = 24597;
    vk.recursive_proof_indices[8] = 24598;
    vk.recursive_proof_indices[9] = 24599;
    vk.recursive_proof_indices[10] = 24600;
    vk.recursive_proof_indices[11] = 24601;
    vk.recursive_proof_indices[12] = 24602;
    vk.recursive_proof_indices[13] = 24603;
    vk.recursive_proof_indices[14] = 24604;
    vk.recursive_proof_indices[15] = 24605;
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

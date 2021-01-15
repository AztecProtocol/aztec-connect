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
    vk.num_inputs = 54;
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
      0x158b33cfa216777a611ce69ed4be187919193955fc0d994338985048c760f4a8,
      0x1eba966b6d13f664c65852b59ff214ac24751141b26c0cc40c619b974f164151
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1f3cf89286811769cf1e3bcd6441202135380005a8b2a16d352761a3e31ee991,
      0x1cc65051fa728b62807ef468c30978e664a21a29064bd07aafa3733f15a408d5
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x143ea41d4b8229ed8c231652c740ceaa8da35b609a0daee3b50b2d2cec518e8e,
      0x1e07503c14c06e3006e7f85e68762fa1faf92fd7ad96af9f2353e9de64187421
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2ad01e987effaeac0bc1f87f8dfe9c921aaa8105c3eacc711ab6bc23772dd66d,
      0x25463b6b02b4695b00505507b9fd6f61101f7086ed0b2f0e7a75538f2232479c
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0c49cfbe0862c2a48032b4d330b756fe9aa7d7d17f081f16213327d7726b1f6b,
      0x00a3646730cac1d070798a320fd87ba159f7fb8124e8a360e632088b37adae50
    );
    vk.QM = PairingsBn254.new_g1(
      0x20354cdf0ccaf16ddf7fdd78a7880cb69bba88e4d410b0b2104fb8394cd8d351,
      0x1a808eac91ca3c2f6bab0770f74270494abd0e16910ef2a0d3cd3170757dfdc2
    );
    vk.QC = PairingsBn254.new_g1(
      0x0bbc8ce931eb3c9affedf54dc7941e192f6b9788b6b82730de41404db2ab1268,
      0x0a6cd2a5f1b137f8c386eff034ccac25ce35232c28c24d28bcb1ad8a64842fde
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x17b6058fdbe037fa2cf6906df0d089b927563186eb94c21952659fa9ceb9ac6d,
      0x1915262bcd18f45d7c51fa4355ec1a478f19a14b108ba91a1bb39e8f698edfa6
    );
    vk.QECC = PairingsBn254.new_g1(
      0x216ee6ed0ed36e9a358eab01276053eefda7b8d8447332b01754b8e1dfa53fa0,
      0x172efa7aa2a089de0a40a94275d6c960ea330ce060d3a5a2b6de537efcfc9bfa
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1eff1b08002b378ad600faa665424dc856ffc23cbde9bfdfecc5cda510dc414d,
      0x0139efbafdcd8fa047ecd9f54791d9ec466f14c3183a45e24872a3b4f1b83e4b
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2cc8718b80f391d53812fdfe5629795298a4bc751d5a4cfa5384fd2bdd601853,
      0x19dc2f3112968c5aafc109788c888b41617b6e04b09c59e700c52da7bba89746
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0809f6e85dd23f1a0f6aa9080a407c0d6245db4484650dd7d95edbb85b0f5e5a,
      0x07088d7a1379030762cedea9478bf3420b6149f7fa059ccc471089b6d67304b5
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0c5916073c7c7b23eca7eb7d59404214174e24d0bfe8ed777887caacf84ad6eb,
      0x25638e4ad2496fae06c8df59670dff6cf7e80a7271b5b860ae89e187fe7f7cc9
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2fa2d4128b88715a59f08ad0f2d61a78bbc9468b82253eeeffce8a6403c8a048,
      0x1d8360f5b090190ef53e727806571cd2afb4d832184682f7ce21eb368ba2d136
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x1a7b93bcf95d295da6380fbdea0db5bf9958e6595150975ca8d578a634d00449,
      0x1cae67275600ca74daf54e3121dbb32b70746d66403dfb2594414fd90068acee
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
    vk.recursive_proof_indices[0] = 38;
    vk.recursive_proof_indices[1] = 39;
    vk.recursive_proof_indices[2] = 40;
    vk.recursive_proof_indices[3] = 41;
    vk.recursive_proof_indices[4] = 42;
    vk.recursive_proof_indices[5] = 43;
    vk.recursive_proof_indices[6] = 44;
    vk.recursive_proof_indices[7] = 45;
    vk.recursive_proof_indices[8] = 46;
    vk.recursive_proof_indices[9] = 47;
    vk.recursive_proof_indices[10] = 48;
    vk.recursive_proof_indices[11] = 49;
    vk.recursive_proof_indices[12] = 50;
    vk.recursive_proof_indices[13] = 51;
    vk.recursive_proof_indices[14] = 52;
    vk.recursive_proof_indices[15] = 53;
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

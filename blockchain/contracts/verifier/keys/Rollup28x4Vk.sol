// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x4Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 49182;
    vk.work_root = PairingsBn254.new_fr(
      0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x22c31ac16b99ba0b7f7f9545c77a341003b0d3c5624933855f3d0b4a48ef3217,
      0x1e0eda1b80411629cef88851220831b06528841c0ddec8578dc180f4ec0e11e7
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0ad455ad7a04445d90f695c6574fc85729ba0a46949691767d5c829f1b46ea6b,
      0x2f0a60f261b06f9788dabbe15c1ac9d109ec755fdd8df2135c0ae001bdb52896
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0300601af361902311c1675821d914a0b9b46de6230af5c9c50851294ae6887c,
      0x098919b21b5612fcd6e71bee5b2bf7e940d3a1332ebb6083e8bd99ec0eeac0f9
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2528b67d8cf9c66a77ad086a01e7e0c491265835b62665e07b73d7bd2fdc4d3f,
      0x2a9b034762351589789929fc84acb37f747d472fbf81b5fe0b6bcc95a83e4523
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x279fd8e98cc873f0dca503f1da7ab9c3174e0255e9f6b6f893b38b45d51bea90,
      0x14e79bb4dcd646c48e14e03d99fb02c52413761ccb783dee5e0476626946e9a1
    );
    vk.QM = PairingsBn254.new_g1(
      0x206be4a15d412f0f95f00ac120bddd584390080685573c22296a6268156beef5,
      0x1661882e823c187d98a4fe6db9c8fa07b7e4840e7c4bb8a7d4735027f6d0b310
    );
    vk.QC = PairingsBn254.new_g1(
      0x227471cb31b4f8e41c0b0a0f23bcbab5962adc3785d0f57eefff6a68dada870f,
      0x135b4dda24f5070827a5db0a1af5781f5524ab47b111094ce8bf88a36ebabd35
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2b87aff1061d91c41b7c450cf9f5de2951faf46756fd24efd7d07fa06a645148,
      0x1b8d7475a7095536137a415b1f51000d7751b89eb269e3df3f24adb88c5b9376
    );
    vk.QECC = PairingsBn254.new_g1(
      0x02bbe461cca76100511347649b085f898b24acc58929a4b0263f747b74778a35,
      0x08f11553f7b039e91a6d81aad1a53936a212c484466b7ecf4deeda43295c20db
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1a33706e332f0bc59cd13b286dfbc03c3dd8349636646e6ae64a3ae7780c4c14,
      0x0d25c3cb42b04c623652b4d08df663fc635ee101c7c57f7748e9aff4d6b8e2f7
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x0d586f212da42f8d446f025c58e0b6cbd18422d50039ee80a29a141395030fc3,
      0x2c0a0684a26727091fb127b8e319f42879676f64317accaeb73693009ca1a273
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0046cfee80318d66b3f27b06a23fc02bdd856f8ebbc458352d4e21f22e821433,
      0x2f9488343341e38f9016ef24c7539482ab11ea5aa63519b15d6e7c05ae1877f5
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x300dc3ec4f3fec2d386077705e05ab48421f437a4785e33205d3f84d3a4b25aa,
      0x058c46a8121c74dc2058c366aa7489ba5371773e1eaae375bda0633c88b410f6
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x09de9804c91eab592bb78155cf52ad0d62c180612a8f6eccea5a6362b74aa912,
      0x0d70115f442f5e926e216f0698107f74aa791f8548856249194febafbf998968
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x07baccefc2d7e7a6aa4400ee3a7d3888cc7396754cdc7a70c37e5a1fe3d98f3b,
      0x091fda49211ae4663589c9471c327c785dee99e922a8b04a797e01b72761bde6
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
    vk.recursive_proof_indices[0] = 49166;
    vk.recursive_proof_indices[1] = 49167;
    vk.recursive_proof_indices[2] = 49168;
    vk.recursive_proof_indices[3] = 49169;
    vk.recursive_proof_indices[4] = 49170;
    vk.recursive_proof_indices[5] = 49171;
    vk.recursive_proof_indices[6] = 49172;
    vk.recursive_proof_indices[7] = 49173;
    vk.recursive_proof_indices[8] = 49174;
    vk.recursive_proof_indices[9] = 49175;
    vk.recursive_proof_indices[10] = 49176;
    vk.recursive_proof_indices[11] = 49177;
    vk.recursive_proof_indices[12] = 49178;
    vk.recursive_proof_indices[13] = 49179;
    vk.recursive_proof_indices[14] = 49180;
    vk.recursive_proof_indices[15] = 49181;
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

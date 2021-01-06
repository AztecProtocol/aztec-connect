// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup4Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 74;
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
      0x1011df2a78b1ae2919c959b8baadc06bb77ebdfd1e3797384e21563c1c8d7631,
      0x0b4a29d008f7f5b4874ad3febfb0d33aced230a4bbf1037800b0d38909e7cde1
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1472a871ce57926e3885a31147c33a60d421045d51b092977ab925c027ddeaa3,
      0x0e6ddf4807355c3369c321bc3cd9eea1ca2257d4e5a2b65b6eae143dde9255e1
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x29e03d56021495f32aade07479dab35c28750902acd03a8a9e032a84c220ab88,
      0x1bd3a234255007f7d6df5634cfc6ef2e6f15ea8e7c57cd72cc214e981bd9e421
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x28574e9893926fe9370c962f06a4126e21d79e8333b3e44721303a5ccac960b9,
      0x15beef6fac9ff1186c53d3be274dd2cd40b221d0e33f0b623dbd1e3f30d4a0dc
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1a10e790bbf15d91427c324ddf95d3eec33de4b952e7431ea35eef090e28d666,
      0x2a7fdf17b8e8ca4531baf2947e3dd2bad51982ce71252d8c4fbdbc75cd640d33
    );
    vk.QM = PairingsBn254.new_g1(
      0x18d398b92457f2923843269ea70109cdb62f85f643038fe8e2444e313e78554c,
      0x235fe8a2dad52d511b11f0fb56a09aad6dfdb5eb9ad2a45b60ce1d6e06a38dc5
    );
    vk.QC = PairingsBn254.new_g1(
      0x0c30315ff08f302bee622eaba827f5cdd4c4c007a5f406ef825f67db61f30906,
      0x2f484f3f6761f8421e7b480acbf1ba9794274809bb36389df2c66c402762961f
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2889bc612f050a0b18583f4012a6365d285b1500f36efd9f8d2d2645bb05495b,
      0x0392589f997b799c924df49659bf21a0c3dc8ac43280fd2da8ff817bc4c72921
    );
    vk.QECC = PairingsBn254.new_g1(
      0x29341500f8c5eef9db0e8fea3fdb602719da3a644f6520954a3f64cc3f11fb9f,
      0x02f606cb03241636465cc4bbfd97473dbe42ffe429d79b62bcaf6fb890784f14
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0c5e271a3443f1423f0a4afba1b7d230f6a4e24f5a537afe2c0f18015fe58585,
      0x29a7ae03f8a6a0e17590549f559175d858957423aeadbfc1a8a9c7f45a8776b4
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1d6aca5725441b5a0cb7fd7481ff6c1035922d66905fa0b162e148fdc3df9904,
      0x003533dcf3d3682ae766c1236dd8d43c0ede44427259681021c03d0d32f5f57b
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x04642062c7653dab26eb2b077d3a29263fc73a4e3b22af901c63c1467ed77f04,
      0x15b997ac8f7860601d29d207188f57ee2433f792c8ef0751a83ee3ba2e61fcd0
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0036594390281e3ae67838cae438da208877f9f76d4d195b7a973c9da5e9a04d,
      0x1161cae3db3e312959a7c1cd7ca04905f988d290e8a6d46499c9e8ed0451601d
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x25646ea2ecadf6006fbe305f053f412f228e5986d4ab06bb9b4556561bfd224c,
      0x1783f658ab4b6f47ab696eedecd569ed9c8be07287b28822a162ed1af517e408
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x100d851d4c63b4fb131761aeffd67706f5dd8e8efb6ab118d18c9766b26313d8,
      0x28a360e9d44076b6f8af59b2d6e20b194a94b629e1edbed1b64824427e69327f
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
    vk.recursive_proof_indices[0] = 58;
    vk.recursive_proof_indices[1] = 59;
    vk.recursive_proof_indices[2] = 60;
    vk.recursive_proof_indices[3] = 61;
    vk.recursive_proof_indices[4] = 62;
    vk.recursive_proof_indices[5] = 63;
    vk.recursive_proof_indices[6] = 64;
    vk.recursive_proof_indices[7] = 65;
    vk.recursive_proof_indices[8] = 66;
    vk.recursive_proof_indices[9] = 67;
    vk.recursive_proof_indices[10] = 68;
    vk.recursive_proof_indices[11] = 69;
    vk.recursive_proof_indices[12] = 70;
    vk.recursive_proof_indices[13] = 71;
    vk.recursive_proof_indices[14] = 72;
    vk.recursive_proof_indices[15] = 73;
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

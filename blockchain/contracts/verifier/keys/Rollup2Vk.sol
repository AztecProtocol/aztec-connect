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

    vk.circuit_size = 4194304;
    vk.num_inputs = 50;
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
      0x23ceaeb5b967f217284ca6ca4f67e348ec563149fbfd054ce59618f6392da9e0,
      0x20929f2d746d49fa5bae67a8a8f010b13941246af4efbfb393e5341e808826de
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2c90bdf3ba1d7139701ecfa8846e5c9949c3afe31f664ddf6c618a4fbfe27719,
      0x2d3c77fb49f5cb05d0098bb481fcd629e86d0ca9fd283dfdf3bb56928ad20b06
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0ea1dad8ba1935075f1eb6a5d23a99d8d4d2aa8f72067078c04159117eb426f9,
      0x0074b643832e2a7e8ea4b103e8e06a360294ed88b6c968c16d05a643a752c3b9
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0a48b65bf0a652a200e9af67423a02640f5d66c43d4d5ff66d0a2600e357877b,
      0x24dbf28ec61dfc696d571549b9a800a1fa3086cc0eb97dd0078c742497b2a971
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x170472035a141535166a4ef6f7cd7deed6830496af21329f079412f7e6152afa,
      0x03b2e7e83c57960e6c2f46bd4dca6982f5bacdea48e92b1875e6a9d916064a6b
    );
    vk.QM = PairingsBn254.new_g1(
      0x0c298da1f5f974fa096949c9c5c285ef1b44a6735bf025bf7461035016f1bd0d,
      0x02f7ffb267b25bf77b14e7c533616e4997c252a8e09ab758a322f4f1faaf82c4
    );
    vk.QC = PairingsBn254.new_g1(
      0x2caeec186933bef4e77e861acc825e331f668e3d36d25dfe60b538ecc4526ae5,
      0x1b494ac302d984a745fb0c399aacbdcf403d442f68f3e903c53de6e6046c97fb
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x001153cff7478ce72469974aac9b0de8edcad70daff3904e041214160c7f4afe,
      0x11fe7c5f8b2f579fedf87d04d00d6d42789eadb20bf800f4a104770b833de102
    );
    vk.QECC = PairingsBn254.new_g1(
      0x2e42d0a02970a78d330cc1a5a2929924f0cbbf4de6f73c99bbee49b0701f9f05,
      0x18b233e82535123c6d68f6839754d58e6ada6f5420e51b2e463caa4e2432fb7b
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2c12b316cc4b7a1a32690b649b36918527cd97b62d08e852a600bf79baf8aa02,
      0x2b859d9c9c85e82e714648c23f1afe28ec613c7cdfaea49f20b1157c0e600829
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x06ca9e21590fcacc1da7814f1952aded794f2e1d931c6ba26469ad389acec87f,
      0x2dfb0385e1bb875d926458a9fdeb15d4e24f5e1c244d12de1749b2d08241d2ef
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1fa4f5810d9645458b40d701b26d1115b0185371e9072d25bc3e8f20fb41563c,
      0x0f63d8713b3e0b037e2154b30608e352d697d96b482b0cceb41c2c3edc6b5374
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x093afcb7a3d53358fe1fba5b70d41757871ece02e26ec48675e033fe94a1a79f,
      0x1ac13b6934d9f566ca5579057bf19a62ba8199f458ac8182473f77d186c65d24
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x22e6b3f170183199ce41f3dd014821574a979a6823aafb79d74b2c849bdb7688,
      0x0b95a24a08327464d5d20f959c05a54e59952969530a1e4442f2cb346d077751
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2f5af88f7d92d9d77e67ab1398b686fabb970254aab53e442b4226da8cc4e70d,
      0x013c9f961787d73eee61b4195d3b67c7c9b2df66a8703d95d63692ec97fb5049
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

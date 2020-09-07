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
    vk.num_inputs = 48;
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
      0x2438e8f17d973a3dedf023d057c113f8d88d63f126a8db5bb56a8c87c356126e,
      0x25db198c7385bb7a496b56582828290b76cbe203b980b8954567559e90565ce8
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1955ba624e0e96862987a98ed2edc1dcb7d1201618b46a69fe560d3693cb71c8,
      0x1415bd99ec55b3f3fdb96f4836d92ebf0dc139e7b12f37ae050b32d461ee4b96
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x011f57a3ec66af0a87e5fe478c3912080ee93a1527eba1d39b83aae8c909a115,
      0x248690f5b3c4a4b615badb4ee3e8c40abe13647a37d01cab727261541519cc93
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0c397955867e37db1ee44bc3ba2c62b22d807bb934d67babc1fb173d202359ce,
      0x0a9537561a3325d82de5cb3ed5b19b47541acdc51008717e1fd8ff61c38c6df8
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x101624ecafdb56f0af3096dde274bca488777cd48559445a3ae98fa650bbf84c,
      0x0eabf0e8987d7da774cd1177c73ebdbb4049928e0279ed1ec525d0f20a2c3032
    );
    vk.QM = PairingsBn254.new_g1(
      0x2320bcff6f12066a1b27d5f89aebc6fdd75072b3852d12c5480509ae0a421128,
      0x108ea11385f0103991b6676a0aeeceae6493b5046ca302507aa4f66c89f55992
    );
    vk.QC = PairingsBn254.new_g1(
      0x1bdfe5be74041adda0ea0ae64b0731b2eb77874b00d8e7534f5b09b5cad1ddae,
      0x24fa88572d4161b8226e3d395f9e752ac4dfa6170218db477949bfd7dce28618
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x23e2453d94fffa1c23e270c98e77fa33c153addef057f75205d1246907975630,
      0x0a1a84b7211debc106024e4e44334ec75c7666537cf1351bc0db392fdc816f91
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0fa913be8888f320bb97295333eaae2aed42682b47c103b7740fdd9e3d661140,
      0x1c7e1cd10702ff6c49482f8fdbb569d85d0bc772a90300dc0741767ad83955fe
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x010f8b0f3117b6727c94dc8009a2d76cd5a4a257e227fcc8364ed55af90a205e,
      0x1608cce37cc7d64e0749c09571671f151ef302d340346963e2cdb3188f3ceb41
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x24124052c368d0b981149be4035b3f47c33b15d9c52f736523c8800636454f29,
      0x168555ffeae8495376a8c7f647e3916b5a04e582691a9b28086287b1fde958a9
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1a1f432f79e59f4838519ec1c842a40d48cb41c5bbae3a1f95a042b47ec33b96,
      0x0d1b6efcaf945725b5af5efc974cf00ac41e457dd5229c30af6ceef4e41a4f4f
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0f3960c899effacce100ef2f907ab9ecd1748400876d537ceae6563a709f356b,
      0x1f1f1086b98caedfccd194f57235b4aa290f1050c0114a1379d87f95e9dd2580
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x213b45e01a8eb06094f0021fc2f77685b926a1b86b619927e81219bf960c1384,
      0x1bb5c8809be9246d3e93c082f3ee595039c7bfc42a2e1a6f7bde8448ca4fd5e0
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x017bdd7d13dd994c654f1770e5c2e73c652b8971f96282a71a4eb26fce595e35,
      0x04355b0079ce48f1c9fc4721d497fa71df57e0c02296790b2d7ba73f73603154
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

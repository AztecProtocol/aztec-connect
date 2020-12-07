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
      0x1d3dfe0ec7354a286b9839cfd86d96875b94e1df1d7e95ba420bdd487a7ab70a,
      0x0bf1d5bea4cd27f7c87d3073c757c20b732ea52b1208ea01303934df2362a90d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x28ca5ffdbbb6b4a8ab18059f1505d97eec2132cd2ee80956b861c7b25b342caf,
      0x2b98aa736ac24e55614bb2db0ab24604d15bb461037c4502285d3e3a77be77c6
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x204dd2a43e10de1b00c0dbfb5184cccb3c7969910b58156830abc02898fc2b5a,
      0x13ffa239def8eb8fea3bada78d3f530b6efd3d7f1885b14ebdab60a0ddd16e62
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x18de4c273572d2bf9924693a5e13e67e80c03f86bd35a4d95221ce1e12593474,
      0x0db4ec60e25b1633976cfabaf33d4d4b0e493cf3a004436f1d8e3c6a36d919d1
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x03716aa31bfcd6c977e0f88e9e50b9ae06a27ba37d9ef0f6acb25eb041ddb59f,
      0x1f63b8fdfcd75e8f1fa06647474e94ade4cf5f1e60ecf3a8c002ae40d555159c
    );
    vk.QM = PairingsBn254.new_g1(
      0x047f3079c86def74c50718eae36aa04700c4070aca37119b955e8f758e756e02,
      0x2f09ff450dd6ca7ab7260494cfdb652d55a46ff5b6a1721dd74352bf0321c360
    );
    vk.QC = PairingsBn254.new_g1(
      0x036213bd5ba53de7fa66a66892cb161f1ea9edf3a267ddbe0584aafc77b83935,
      0x08d73d276f5a3585c164a2e58e96d9fdf3329c8405fac257cf53111d1e50285f
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2235959d4d24d232bc2aa34958495e1c897b538b21da2599ddfb16e7a9f45846,
      0x15f8accdd10046dc1a2be056a8dc9efd3b11e1f097328c32c86efb1b0bac2be3
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1acc0e19c718ef3395105f1de205df2be96d351ce0d50c907a8b1476e2c0a93b,
      0x29d2e943e8874b3fa275ba2fccf99ff64664f2ba2120f2cb9426bc4b14488ed1
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2177ed7c87fa9f2c69bb8fe699285502cc05a0170d970efe2af7045bf02ccf1b,
      0x1896061d48260b0fa00b1c91783ee4d057230801c324d01e3b12719f01cf0580
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x00f02c0791657ca430edcaa49130e0792c8d17d41a7e780deb503ce2d52444ac,
      0x1439fe7bd6b28192b7d417bdc06af23dcea657b29fcb1ad6dee8540ca62c7e2f
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x300986cbee4bef213438b32c83c907b60318b0c9055dff5b51c956eea907e174,
      0x2a9e067ff444035821eb9a62afa0dc1d8c78b436c114efd150ef9514d2b67192
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0e245941768c279122af5b421535f0174c990d59f1b3648d85d336553651a61f,
      0x03e8f105bc23f7e6a04cae2d62d966412ec7b4b392080ba3b715d8aab455014e
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x15c495c25b2b31a103beaa5754c849d0cdacf10386099c60cf08ed32cb32666f,
      0x1f59afbc73df70732513c157aaa13d9a34311614486cefbac6a93a04a34d9cb2
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x06824e1448f58784b8392a29baa573d362c2d80a592fa0e2f8498fa848870521,
      0x2f92c09ff2d4548d9af6e6ddd2d2b0419f459f520e8058388759500469499057
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

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x32Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 33554432;
    vk.num_inputs = 12318;
    vk.work_root = PairingsBn254.new_fr(
      0x2a734ebb326341efa19b0361d9130cd47b26b7488dc6d26eeccd4f3eb878331a
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644e5aaf0a66b91f8030da595e7d1c6787b9b45fc54c546729acf1ff053609
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x27f035bdb21de9525bcd0d50e993ee185f43327bf6a8efc445d2f3cb9550fe47
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x11d2a8e8003a7ddab0d186f5ba48c7093f91f8066e6217dc9f386b43e54d66f5,
      0x25c2fad66bfd5d7491581c9862c103342574df2830d081c20da8d07702fbe7f2
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1b74d8473d02fa740b82d52312ea6dac7b8401122d10d9b075ee26abfdd763f9,
      0x28efcd709d5c10ca2c65eeaab5b294068c03d98f3fe11f6406cb09c4e38bd9ed
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2e6f4066fa7e9054abc23a4ff74b37a66d649e35d159d5a058d693cc22e95e0d,
      0x0e730547a6fa4283346f2625e5f060b1ef8398d555796436e2f371688fba3b03
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x15e1a9f18685a764d57313eb6a9bb7f385ec08558e7bba567a4f759711ddaa3f,
      0x250706758064ba268bf17f6ff6b11e4f70d94e0f9bc23dcdd15bb8f15aa99b0c
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2d4cf97ac9e50da50f2c5db9724ecfae45d29373508363f395feb8c5b3c152da,
      0x086e6cfa25aadc97abfd9f2ecfac621b3b2f3e9ccf23400a5b77de5b2441e74c
    );
    vk.QM = PairingsBn254.new_g1(
      0x032779282156d7fc67e7aa5ee400d9a019249f65d377e0b6d6e1340ab91b9edd,
      0x0eca6649be8268276f57dc117ef5af49029d26514f14f47e6ffad5c0e179cab0
    );
    vk.QC = PairingsBn254.new_g1(
      0x3060266a23a0d41bd48c91a32cc27546bb81c21c232267e78a0573c648355d43,
      0x0c20fb318b6e60cd571c632051ce7d2cab0b2789915374af995b3bdb5b703d77
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0a10616a00a6af3d7fc256e920941be4cf99317e4a1b368ec145bf8ce7a72378,
      0x2fc8c80dcf2330fb893d99e12e11959eb97679730879c61592a566a06ed3b6c4
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1e22063e2fde4e8b7192c394075473a1d0aa3a23a9273cdc555c522bd401b73a,
      0x22583e15816116a8743e3e8c6ee86d75ba64346115c53d0eef50a20569ca9cb6
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1b6377d8ee470002bdd503fd358f22932a91fe8f6790a862b4857eb018ff12d1,
      0x1b701dc2d7862e13a4a8682c06d3f212112c0b276e7f9efda07e301e3e0b9801
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2ae6958ac716d5c3e9328cbce5b30e88b3e4f24b4e0c5c759e8cc00e4c8b035d,
      0x23c3a6b809cced1a1db0597e93809b9a6febb59e8f8fc484c092c82a1b316e3b
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x185ca9b821082f91857b4c5fdb352a3f7497f23520fce8647faa43de5025022c,
      0x0b39c36eec3d6910cfd18a0150ac38131e880e774e61a2a57db43adb92057577
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x206ee94a2af7ce1c8b7715f147773f5875da88f397d2627c8817868a39ccc037,
      0x2d4f490b4a3ee86d0b06b1a60e92ad64658a7268fde5b4bcbee0bc9e94ec6501
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1cb67a54b82ed9a23dc34e62318cae210212e8e77d250f47be9e3969ffa322f6,
      0x088728016436154c8aab6d34627a1ded34778216d8e474f96ddae85f0d749ed8
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2265443a39467394c9606e9b38857b1fde01402fdbcd5967c55afa01034a88e4,
      0x284d70cde380c58a6f603cc8167a11aa968f2161e5f15d0dd2be0a96750ab916
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
    vk.recursive_proof_indices[0] = 12302;
    vk.recursive_proof_indices[1] = 12303;
    vk.recursive_proof_indices[2] = 12304;
    vk.recursive_proof_indices[3] = 12305;
    vk.recursive_proof_indices[4] = 12306;
    vk.recursive_proof_indices[5] = 12307;
    vk.recursive_proof_indices[6] = 12308;
    vk.recursive_proof_indices[7] = 12309;
    vk.recursive_proof_indices[8] = 12310;
    vk.recursive_proof_indices[9] = 12311;
    vk.recursive_proof_indices[10] = 12312;
    vk.recursive_proof_indices[11] = 12313;
    vk.recursive_proof_indices[12] = 12314;
    vk.recursive_proof_indices[13] = 12315;
    vk.recursive_proof_indices[14] = 12316;
    vk.recursive_proof_indices[15] = 12317;
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

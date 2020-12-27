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

    vk.circuit_size = 1048576;
    vk.num_inputs = 38;
    vk.work_root = PairingsBn254.new_fr(
      0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x066d3d2d417595d33d9e6202d0c5ef28c293873c6d20c4ec066f58678c5b3e29,
      0x105556d0a3c9649b4fb8ed1ae34e48c4b79775af6467f0427badc6acf3be334d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0e0969e14b2f662b656be9d45b277a7b9a1418b2de3748878e9110eb4e99bf99,
      0x1e472897d2b664859c2ab7953bc17ccdcbdf15717ee2f5fbd1f4a9ca52dce4e3
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0be750e52089dc603fb0adce3d4764f2b78d7afeb053198913f25e5623b468c6,
      0x2ee4810778ba2ce7e587ad1a20bec2bf6f192eb753571ea09afa657908e74c02
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x121ff76159624fcbf85ada0bbe7a7c8afb6d832a4cb7cf14960aecbef19ad1a2,
      0x176256cf36c92880cc391c614f723f51de39713d8c7e3f4cae9d47f41aaa4943
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x26e5a0504604fc37fc982d2fc3429b2f03193d6aa737866adf14bc0880deab4f,
      0x24b583409a6651fbea0d72df37e4e6582f03d36aecf3ac96b6589302054a4dd7
    );
    vk.QM = PairingsBn254.new_g1(
      0x1b1419aee40128d5aeb57dbec411c4b5ca30f3a51d1258b3b79b8b9bf9d96eee,
      0x1188e9a954239437a5c8dc9e643dc56f9f4bba6a028471c6908513a63eb2f6e5
    );
    vk.QC = PairingsBn254.new_g1(
      0x2e04fa4318c5aaf39127fc3231f0875577ab5354c6bb796ecbc84a7404b71089,
      0x0f1553f3880898cc42f08348a41306efeee641c3595b27bba1592e40c09d39bd
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0e6862325a98807dd5a0738eb120677dc2ee8e46f2b7755ab303f3095c5ce18f,
      0x1d0c06b1ef2eb8703103ee15a685151564e276b6de0c74c51db52ad031f8647f
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0f1f55e617c3c1516e64bf47fb701865132dce17a644f59aece31bdedfea8aba,
      0x07d3ea38bbe07fa1a78cb8c9bb5b89deadcc673ec063aefef112ebe3cf96aa4d
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0a3aa1e09073f38d861d8668bc138e12b1c16f16de7dda6c5e8bb5d46e276c57,
      0x18e3fdded63d28ef448dc2e130db944344df368e8e42937a193ef922ed62db5f
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x29fcb1fbf89dbd5df1f52f8aca5099aa433b948b4f01b7d541d7cd7004e88e76,
      0x136d935eef4e8ec9687873d64d718e6a71fdfc5d32c7d207edca8098b65d3221
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1a68c96ca48a4beb2f68ce94625fc7f2ad10f9b6a6e7d366162314abbcfec137,
      0x302d158eea99b8751fb067ff5de7e6e295a9b1d5914d1cf0f7a836b3daf2c0c3
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x3010554dcd491950c89eee834617ebf23bcae8801ab9e28d0d860e60db07381c,
      0x1975e6983c899840d4bd3d2e7bc66ef1ecb6a960a08e3b7c9264d5fd56dce545
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x15a432534e1d9d8c8a1cdc27b7fc6a912935beaf7c1b4b23dcc31ea1a6d766f9,
      0x1d618152fc0a52efab434fc092300e06ff3dd5fd18191159545609d4888d01c6
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2fe19cd3595f79840a120032eab7ae52e4fbb5b76c53f2f71f4feb49f30c2459,
      0x04d58500d17792004c847642d70764c7a2719928d2f7993c501c4c72d2a6e642
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

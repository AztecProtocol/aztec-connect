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
    vk.num_inputs = 42;
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
      0x20698e2489ed3ea6217702b36fbe1e0a5a5108ae025459ac5d911f3c5e90bb2f,
      0x1c8648bc89e9ae5fe2b9e26c7ece1ee159a896914cd979bb42ca1cfaf4cfc393
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1af4cfde4266fcffffa1f2757d8dc2e9a743541e8f58de4ea1aaad15a45d50a2,
      0x124a93389b47731e5abdd4d73802cd80e9206be0d9380418a287578d2fee1d57
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x27ef182fa5b6804c96c4cf99d5852aa52057d83302e43132b5ad9c1b8e8a0937,
      0x014af416b5f37699845ff2ef5c34992f1f1f5483708f981cac16cd61044d345d
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1cc2b293700b7daee4c900da16174b66c27c68a909a9cc4bb5bd4d47c0ad528f,
      0x0f0830cf9edcc32fc9bb57e073f367dceddc8cb568851c6f2c642eeb05105e3d
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1740025b6bd1643f2e00ec1baeb0d713a0f747859a49856808851bc9c5a5216d,
      0x29a9446a0288f4a876995a292ba4fa3263787f8fd1034328cf96917c65f54d09
    );
    vk.QM = PairingsBn254.new_g1(
      0x2bbbeed20ba5142d8a6d19e4f2e267e8c5fa98cf8e54e4622e788252f74c59ac,
      0x219f19d6d8f680eb4135d63a6a4cc0595075bfad21eda394184ab1aac95b5943
    );
    vk.QC = PairingsBn254.new_g1(
      0x2bb17b847917fc9ae9a7bdf2dfa159a5524bd9eb3857935b735342bee2c48beb,
      0x07473161c4099d270ba6b05e3c199e6ccb18f41762483adfd657019676d0806c
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x12d15017e96e46461079dc85c40cd9a8660fe63dea96971226bcad86013017aa,
      0x1033f716abfa7f3cef661582d95ab2f47a465a92cb660ede2442712bea7604ea
    );
    vk.QECC = PairingsBn254.new_g1(
      0x2e4983cc52dc9f994ad73e170a8405ebf2e8da12c5f52d58081b8661247ab014,
      0x146f172fb04ffc7f87f27d64662b4a44a3bcb2704314598ef879f6d6fb0c887e
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0c713b8ac0cc8a3cc81dd5c198992eea76b3eed05bc5b4a1a677f1bbe52c722d,
      0x0d0e123169400d238736c34e88f289e4d5a0a07977532e0591ae28df2b993d90
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x101ef231263c4d5d9e17d98e8aee272a3f8b855e6687e72848f8ddbe7422e774,
      0x0bdd2c0065e615e49581f24b41e6be31b5edff34733980597cac196474212c22
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2b35ebad3f67e68766b52ae9eabba12d9c22fe7bae3cc761b391855035c4147c,
      0x05166c62451b91fe9f39d962de62a6a10e338c0a696e0109f92826359fc54569
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2fdd96535f0ca0bed74176ff72cfee0e383633c81f51ff173e76329100e73ca4,
      0x0c9d228c47649edf40572c675a65d1d8415bc510b47c32ecd2948607fb51a05b
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2221717886072dba4f65f222f2b0fc9f355d4a39047db2df80734cd26b023938,
      0x196e9e771cc05e6d430bd19d3d5a5360d44333ee5c43a6c79b1ed24617b7368d
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x1e5911e08b7179c4d1a47b4f3035d199e09a24067702bafe08b0b010a827fd1e,
      0x09eee79b402ae3df1a254f4c5bc2aea6e42607ca843cdf95d11c2008acc25abb
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
    vk.recursive_proof_indices[0] = 26;
    vk.recursive_proof_indices[1] = 27;
    vk.recursive_proof_indices[2] = 28;
    vk.recursive_proof_indices[3] = 29;
    vk.recursive_proof_indices[4] = 30;
    vk.recursive_proof_indices[5] = 31;
    vk.recursive_proof_indices[6] = 32;
    vk.recursive_proof_indices[7] = 33;
    vk.recursive_proof_indices[8] = 34;
    vk.recursive_proof_indices[9] = 35;
    vk.recursive_proof_indices[10] = 36;
    vk.recursive_proof_indices[11] = 37;
    vk.recursive_proof_indices[12] = 38;
    vk.recursive_proof_indices[13] = 39;
    vk.recursive_proof_indices[14] = 40;
    vk.recursive_proof_indices[15] = 41;
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

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
    vk.num_inputs = 75;
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
      0x2480fa60eeb54e66a2031f911408749fd5f557617b012a037f5686a2c98ad2ca,
      0x09648e21fce885575579604710f1b32582636159b4cb715eae3db2372948f2ff
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x135fd1594f6228487422d8f72729d6c723805ea33b099abda46fa703a51a147b,
      0x1f1f9623fb5187542a57d5ac70af9076457a00c694bca4714e1631d7a39b9998
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2283c3efb72fd5257cbfe679b8cb6fcaaf64b352c40454bcfaf0d1ea724d1900,
      0x01a375bd9530b496c74b0235c3029a41b48ff0b1464e421e918da93e7e38ef2c
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0d329fcf43e7b80a95d8a4bbfd2d1e8ba1d1ff7e8cac75e4a15f8bcc58586b17,
      0x01c04860ad8978ccd371554708c76d1ff1094c95b4da2ef347a243b0bf8a24cb
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x28f902bc085658c18740df4ad6184613f549aec3226539c21fef4bb7cd9ebc56,
      0x0a983f32b03d1536c975d927d16fc787dbd3a2b35c1329689d516be0197d8702
    );
    vk.QM = PairingsBn254.new_g1(
      0x0934365020075a200f4584c450831ab9817bbc382aa7a7fc688ba19f60b67cd4,
      0x09b897ce8ad39d21b5ec708866c24b432058362eeae2c2a875e9e8d9169eb674
    );
    vk.QC = PairingsBn254.new_g1(
      0x1fd59dc3c3262522cd97234e5844eb5c59aca64cab4a7261a9af055c5d004210,
      0x07d590cc49818c4c8534617d99afe01074943a8c20014d8f696bbc8ce5af2eea
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2502f843b92658505a7c12b15be7d91c27308ff35f20c6ea945b763a41a57468,
      0x132984e432b81e03f8238d7fbc6c069204533f86a5463431f08af46596c7d24b
    );
    vk.QECC = PairingsBn254.new_g1(
      0x136287525583ad5bd04874d414d4c0abe777aa46c4e33e25fe9f4006cd31008e,
      0x2627e80a7f2b99c37f69bf873f5c452ceccba8240fa6642dc8072e9ad4df8d97
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x181507e04e4395f40de33b990bf270e0057ff852d3979d6c9d4dd206c1791bca,
      0x130f02c5420d8db1a3a254f04180326de95db096a29a8045ff507e06646337ab
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x071fc1d94903689b7e0f050d7671a37001cff3297c1e360190b49d4ef8906851,
      0x2ca919bc9b13571e72ff95939acce6109b33185bfb817eefdf4376e0f1517226
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x02f9fccf351fe3275f5191252795edc46ae2e6cda41b9ced492666e235af5a2c,
      0x2ee80ccc55923868821a36f28ac86c9b40dcf58f02cc9ce33f1a7b499321d7d2
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x19e07514012445cccfac2d4124bb8a2a6afef9120b1ec27d30761eec9f3ca2c2,
      0x1eb12bcee1aebb04a24edc547f6b07a079304cba7ab04c96d38b4254ccfe728e
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x190850fc25c102e2deb8bf388dfedce7601082f9e46c7428fda17bb873dcfd52,
      0x2ab5e073c828c54b6da15b4440e333e90bfe86be44daf08922882fb26b8f9980
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x24015df4efc4b8ca5c48732bfb196a4027220165759f4ce9c44db84dd9508e74,
      0x149e8c892167bd4636dcb9f254ac5dcfbd26dda276789cb2fa48e2cecceed854
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
    vk.recursive_proof_indices[0] = 59;
    vk.recursive_proof_indices[1] = 60;
    vk.recursive_proof_indices[2] = 61;
    vk.recursive_proof_indices[3] = 62;
    vk.recursive_proof_indices[4] = 63;
    vk.recursive_proof_indices[5] = 64;
    vk.recursive_proof_indices[6] = 65;
    vk.recursive_proof_indices[7] = 66;
    vk.recursive_proof_indices[8] = 67;
    vk.recursive_proof_indices[9] = 68;
    vk.recursive_proof_indices[10] = 69;
    vk.recursive_proof_indices[11] = 70;
    vk.recursive_proof_indices[12] = 71;
    vk.recursive_proof_indices[13] = 72;
    vk.recursive_proof_indices[14] = 73;
    vk.recursive_proof_indices[15] = 74;
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

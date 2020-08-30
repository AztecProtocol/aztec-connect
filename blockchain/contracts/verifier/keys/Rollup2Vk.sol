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
      0x1c973becc5ae5fe7b188a00fcf0d57072d9129a0ed7a173359bbaafce397a793,
      0x22e71bba1a21fe2e22d4f7dbe8d3c33e8e4f18e957874bacb79d2d7a7b09d0aa
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2e855798bec0a8235a2bd2cfaf1e035e3c9a947d68ecfb49e20302da02b7ef9d,
      0x1bd195f8176f2b1eb24ea66551878b8ec2dd32c57cf475f0fab438afcd6f75ea
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x288059a315b445cf084eae996baefb0f58728891859bfd3aecd184e5a3107e4f,
      0x0bdb246cb9f40a95d74560fb264aca8775d86f1ce54ab27186b1a7fa13b43dfe
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x26878f486f7ae63261d252e463b7f3099ba60eff410f014279a5ad99d93105ea,
      0x1e154e800b36c3aed9257e981c1868820b46014900689fbef2864d268132942c
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x00d5842be895e3da1759b551f67879c2f5ff3ffb694629aafa6526b31e11419f,
      0x0f75628890b27ec3e016f89255a71ef8474b6e12ee4fc08794661c3282dd5f05
    );
    vk.QM = PairingsBn254.new_g1(
      0x127d560c3c35c2128ef92a5a7ed6d9bcf4e286bf0ed9e60dff8c71cfb75cd223,
      0x08bad7f9c6dc4eb8520654f608b09ba135d3d3a18ee6da4002b355ac607c08a8
    );
    vk.QC = PairingsBn254.new_g1(
      0x26778ac43c1de2a7857840aa742dd6fdd8d83d18ae9a1fe2f829e98b07a50c6b,
      0x0ccdba5e6bb2c95d3020c2bb79ce7beb96e1aa9473c454bf677aa999e0439d6f
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2558db55d3359ff8d34019844077689ff9e38ceadded5c011b6a0f0690daa0da,
      0x153d5c454c9874235b716dad05dffa06a52901bfc1f51bb70563d34931e9a611
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0a2c03186de2073480d4332cee14d8d82085b9277d1f86ad517e266f0ca41cb7,
      0x206afcc89f18981dbbbc6e87ab923a9b2c6e03b57b41757c7df8ec0cf174b9fd
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x09bf7a681b58bf841e2293c9d2ca90ab7e55020a7b7a788e2aee25253b44da60,
      0x0bd66e2c16360bdd42c71a19ff0e4464910166181406d09f86ad033cb01cec83
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1ec794a873b84828dddceef9f6b9013a80106237a0e2c589ccf80aab72bdd0c0,
      0x19d0de49bbf4c49c9a4f6d3f4f29126219b7974f34a20315c3d4e558c5367c08
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x208d146b37e9875fdf2e2dcf6aaab0ce39293dd1cbca9d3793ee3bafe2e49ad3,
      0x29235d12d6521fe0dbc3638526e01737115e000a4bcadf0a3f1f91d1362974ee
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2604fb738ebcece06f4d1b54c84aec1b94603bf88daa8a616766f4d3bc217ca1,
      0x2374a5b9c2e2499b1dbd7a30bb6f0dc69031452e3fef4e61fe8ff201790449ac
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2e4f42c10d6041e8f2713b910e187d011fbeddf81c21ce75bd9e79d309388097,
      0x014308f41927136d793a952345986e8c7c60dbd42a58eb8674902aba347ab21c
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x062c2ad9fc1677380fb019b174f2888ea25ebccca57e7409f048da7f4ce59834,
      0x02f68c9b24fff2edf9d1de3bd53893b07ef3973dbd9f74bc0674b61fc7ac7d4f
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

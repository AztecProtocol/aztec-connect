// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup3Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 59;
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
      0x11d67a20a491646e81a25a0367cffaa67935d6b971802ec612bd5bca91993d71,
      0x24e0af2df8c098616b89c4f939c747ce44567bfb530b64f3a948cebfc0e7fa3e
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1258ff459c278386b99adb8533c462e3a7056996fa5ad02fb156cf860b472e22,
      0x04b13dcb18a52cf79019df8365a41eb9a51aaea9eb86544e176356d6b6722366
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0a0daaeb01ab5f99f46890c27bbcccf4912bed2ea319d44e13089fadb57ce8a3,
      0x0039f4c3b4e5494acb348f51ca21e5efc4688976c3c76600ea4893f3128cb476
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x248c7b0df066bf2f14f209b3c752ce0d6864dc593579910bda6bdc9796fd135e,
      0x031705f6f80325f8716fc03bde7ca0af248f323039db91b8ac3abc870d64331e
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0150bcbf24ed275033f3248b3e320a4b410f1e4e2922bc29f891621239a046e2,
      0x2c77e1a1d671918e7fb363935b02a268c3979db59ec7252e0a3a9deb6c28706b
    );
    vk.QM = PairingsBn254.new_g1(
      0x117bcb14c95b3853724f7c679cca66e6a19dc8a774c0906da54522b0f7a350d6,
      0x2f8ea8989321c14bfd892a93c270eedbef50d0e567ea495a6dbfb4f4de2fba17
    );
    vk.QC = PairingsBn254.new_g1(
      0x16661875d82a4b2ec361c9db70533669de0be5c87c46f854b41ffdff5017f9d0,
      0x011e7d13df712050e093c7ba974e93cbcfe2c9fc07f8eaff8b798592b24211a0
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x16085526c0d1652b0890f22abdb2b13e2378adf7b273d5065a15d30059a76b82,
      0x28835fa644d676f1f8cedd9426891588e74a489c28551cf04bf535a0dae53e44
    );
    vk.QECC = PairingsBn254.new_g1(
      0x2a34cc319cf9f740b4c9080bafa7be32839e49610f209614def7586e034d0e7e,
      0x2aa21be9651deec3482ca922fdba138cd5bd2d780718cd032e93e54c5292ed89
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x007be2de0ca57e8c193e6351317ff6a3a90127065617de9a13d8b291211672d1,
      0x0f89141040dd104668ca488d90ceb2d7c3788f39a4e7ee36310c27fd4eec6396
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x08dddb50b730d2b8edc1dc98006aa93ecdd5c035a99542a0e07d6d7f1d959e53,
      0x29a1d689976720408ce0a0536cdb1cf6163f02acb67f0c5a65c78d017f4dbc70
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2c8c6f2265caf30b3278a03dadb9c8102cb8b7944543a738bf18cebd5e0709af,
      0x26129f12ce9c167bcbbf8d39a9918a3d1c39d82ef4de5c6f853d2b593fa2f3ba
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0fcad26244893894dc169464698a131c28cbad730a5f00b1b6669e908903d839,
      0x1f3f04c9532dffda97b017447ff784638f6eeffef673d9bd65a916203ef724f0
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x301c8a7817e601c9ca814d6e0ec0424a5fa2c0f94834854dd2e39ca93f10a6d1,
      0x0ed366c486df7ca15143fea83e99529968653af7289f6eabb48f9187b93aeb9b
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x156bbd4ddc413bddb3a44d2a89fdde4b2f40c010d44290847cdb26d115cf84df,
      0x21f62f76e058bda91af23cef12b0fae5e83c230015ef60705e1376d5320b816c
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

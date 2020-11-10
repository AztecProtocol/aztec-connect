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
      0x073d1c4a05158bb31e2b2fd8c1d3407eac664d802dac9c346e6144db0ad49f7d,
      0x0f6c3b915ef602f5f780bd5e3c2ad39ad9e4f4d98bdc7fd7522712325fdb3675
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1335cc88fdad3aebf3dff52ada1ec5da9094315c973e1d0c8ebe50f7cf9d731e,
      0x1f9e3dd5c5ae23f31e661308d4e6265ac44f12ad88003bf7c75a1d5f72394890
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2fa476f520978e231c14dae424596cc487b2a739de562d4368df5cbcbd4af3cf,
      0x2a44e51122de422a4533d439c853e4b83637ef59a0526e6b47551883845b38a5
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2dff81d719a546ae3f582ec8bfc5588f51b91f6b267dc231e74001a240256322,
      0x279642592918263325c46b6abbe8a30291ec348e66736083c0733f50d82faf3e
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x13793b97a40545c5130e39ea2e442f5c1fa756a72e06dbdbbb919c8b4ae101c3,
      0x218a712dfefe2ad493614ae10ab6afa6c7ce5b033a238c43940d7592dfe297d7
    );
    vk.QM = PairingsBn254.new_g1(
      0x2dc445fdf67400532363be1f071ed5d951194474b8ffddc98addf4e976cd2917,
      0x048acec065a1c264969ceeb7fd3dac5bf1ca8ea59d63789d6cd7c54c90f3667e
    );
    vk.QC = PairingsBn254.new_g1(
      0x2bd42f92c9e97d2104106cd8fa0bfd9f1c0930627c8894ff18aaad7f37da6f31,
      0x25e29001a61e17c5c6624fb7273d57c72928b41992ae8c5754d073088c782306
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2be9d2860651f227e650048684fb7f0ee75d96037a0ff09ee4675b715e239392,
      0x0ae5e0b3a4e86dd83a3f5a7c5487f063f1aa65d98a0dbd75455a8b782240ec8c
    );
    vk.QECC = PairingsBn254.new_g1(
      0x02d994b52e0c254ed744c3dd2c24b5c0e08d5a7f432f368285027c4ecb0e1603,
      0x06d819d4cd930133e9a69a9ca9fa3c08f42195c23c78934b9c520373c3c3ee3b
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2ffa82910132ee084f5116919a8fa0eb78629103919874cca84fc2cb36e43175,
      0x088bdac8a332c599a5bbf7e1ec5bdf477a0a097c11ce731683189953f006a8a5
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x09a4e51d23aa36a93483702d12ad0cd50fe893adef84b4664026e2c01c3ed2f9,
      0x24597617faf3f5764a6906386a6356db651c837702616e1af023897ac5194bb3
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1648a6c3ee7b8475b90710393254b6aad9dab1421336c6a52dbde947fd05fca4,
      0x2d815df7cd5b967a2c4562c34cd460cc464933ce44eb17c14d7ae0d895e89633
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x179355eafa270a061a0d00e3bb9f61f34a5c9019c6339667774097116bff4263,
      0x2a9665936be76cfa9abf5a7bb1c7dff4d9e7c5a41f85b7e46a983e5c43baa3e7
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1c83cb4c52dddb5bf4dcb62ca80c04ec7dcfda5110c01e24d294bef2667100c2,
      0x27f1271e6d6035e1e71b26cdb6ad71c12a8e5b9273909c28f433d0cf85c03f63
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x21b7ddef57943c760bb1444d82cda93260e1ad5ab9d418a130921ea85c670e14,
      0x1a6e6a0bf1d607c74209815ed2e3f5d468a651f2929072b6d7c27cc72544eb72
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

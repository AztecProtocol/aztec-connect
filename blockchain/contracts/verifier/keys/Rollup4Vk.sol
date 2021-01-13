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
      0x3025a402040b16d183967e2b34856e2eff86c26c8e57c2d26335a7980b3f2320,
      0x0be67ff6aa37ad76da9b417fa94bd679dc09da6306d5884bf2dbaec30bea3ebd
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0f5fb7b2997ad3d5945417900d94fa39d06f79795b50a27e2c522ef9d3da130a,
      0x132e13ce8916997b5cdba594a162ba9fea140e19ab77ee4f87e1e5227c272d88
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0a937bf509bc320757417e7c15a468aa2cbbf3239dc7089fef067f0840bd1e79,
      0x0f9580bbac1b82e3b6a5b83a6220c57d6357719f8679509ca72256f7d0d43c17
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x210878c7b849003be8c0f48a43646eaaf9a64e5aeed93d770046b02c5db4fcad,
      0x0d74ec539d6a68bfecc20639e7dc3263dd7a432ee0336cef951a6a00c3430abd
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2e07808c655787865894538a771bf3a787f1a852243a1dd6c856c46202b2a91c,
      0x294599aa4cec579057819cd1df14238e52e0bd40f91eace40f82d844e0138a29
    );
    vk.QM = PairingsBn254.new_g1(
      0x25a4c20a230269873a26dd95175f3c1d6bc40a528e106edc0eed451a592b2fea,
      0x2aea3118721bd948aa8add1c40f6457d44f31ad00352f937878cecb232936e6f
    );
    vk.QC = PairingsBn254.new_g1(
      0x179b8ca9e6839ae0e7afdfef15f921017ca082a8d371e4027685eea474433fd4,
      0x28a475076564a16f8a11fa5cc5d98a015ab0af60246d363660556c7f8484c3f3
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2c7633b6b261ad5ae406387bede003e21c690241cab82440ee104eaa670596bd,
      0x2975a05582b08e38c0129856e24bc363cb1f958c7d5f796272dad21ec25f4b71
    );
    vk.QECC = PairingsBn254.new_g1(
      0x26c00619bbc799b2ed1d0488f7e1f44a929a725f9027644741407d30b15e7752,
      0x1b7d4eddf77b2cbd54d24279abaa0bcee0f2045f115c2c89c787487163195ac3
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x043a884a8c48cbb721d6bc7fde04f2cce3dc7bdb4df955f04bce23f343e81dbd,
      0x20ba6729b6eb0b07975e6bc536642da983458872948f509f779c9df0c466af4c
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2eda7428952abf91e9c2d8a09df728c6d059fe6e40dbf6e97ce2bd2d3e7a9656,
      0x1f48ff164fb9c35485f97358dda5746c14e13d71920f3fd8b14a93185e9a8313
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1647675cb9f8a40ef882cb84c617c103389308550bc414874b8c79f6686ab5bd,
      0x204e2d5410c07e8a12beb46362d2c74cb709252a98948894a13afad2b9396735
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2c327d58e15fe1e598e5dca5fbbf56c717ad501f83ae0197350b66fff3d83e24,
      0x0afc14757af39fdac1ef6ce75daef4cd521ab33bdd7fd12f17436db128ba9f78
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x09474ad211b3b279e24273e30d8f07a9074f697ac39d9e3388e70d57af80bd9d,
      0x053c991692f3569c9034b68c16b778685213d6441850129c52106c487c2cb4cb
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x30544144c6f6288e2975bd1a2c617d6b78a4826479c2b417a28730505c29ee58,
      0x1e1bcc7bd01f71a48f47562a1d53dc2935356372e8419b7599409ea331ff6b29
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

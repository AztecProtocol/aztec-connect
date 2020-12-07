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
    vk.num_inputs = 50;
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
      0x1683664acdc1ad36b6fbf269e9e1b36093d072a1b78d152416899efc4ca7ea2f,
      0x2836d8b90c292cb826fedab894ef4ec8d2ff64cd7d3d122c8367ed7aa0532e88
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x02fbaee439512ed1adaf173afd31275d82b9c530f0ad91d8a0a906ef519ac06e,
      0x0321159c7db11f8c3419058a70e4be1d305c16a6633cbfc178c54b76bd522b23
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0be1b309c3af4453371c85305ad4edbc640d194ccbdf8b1ccd8e44c1c8c10927,
      0x03eb6129d44546aba6f16aa479a42510209c32db255a75b4b5723fef64eefeed
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1a4d7b52aae880fd01b1597b069612f23ed047f06f29f2b77d2f350d52939680,
      0x02018991f9f84a598bfc4cfc76f76cffd330e8278bf342803ee008c0a9b64b0f
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x24710a3795a63fc9af5921a7861971a46ee5cd8e42dda297275efff6ccb7b623,
      0x071b1cb71a1b29cf968a4bbd1d496be01ed980b14245804a1d52e38a2523b2dd
    );
    vk.QM = PairingsBn254.new_g1(
      0x18657594cad404081bd5f948999c43a94c094482ad0943f356a51e723ead9c35,
      0x22447cdb5703654bf2d14fead425f0da0c7d44dd733887982d053a1f5cef213c
    );
    vk.QC = PairingsBn254.new_g1(
      0x0c09f786969b26db4714b03c0fe9e975b1600eecee31a4e742c5769e700a248c,
      0x24a98dee84dec3fd1c6a74ffe29f133b0bf0f037eed701b86069f682270b090b
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2149149e84cbb6b3b8f32165f01b9e22ab031dec338e4966ded124ac9301cc26,
      0x0d800fe18fc95d34c8b9128af9f3cb43d5da51c2b5b2539484f40ebea6a54458
    );
    vk.QECC = PairingsBn254.new_g1(
      0x036d78b892cc6fdc7597ad2deb568e13ed09159201da425cc319f8422941f421,
      0x03ceac03fc1ae8c0c87705322e70334152180a6580d623c05660f2b916d663ef
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1cda14e6299ae7dee50317562187306e4c850584180ba22309ece357e577c779,
      0x14cb41b12fab2324d94cbc8e45e7144cbcf0ce5c1766284c5c6b5e9c124d0740
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x155dc0ba49eab9999efcb7bcf51b1b9b481d12b9577af710570618197dbf76e2,
      0x0aa2f1237e31bb1b238784ff8b6c2af797dc772d0344872b81b14586ab3f5bf8
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x24d574923bff192698f0105dfc5a938a128dda8189bafb3935a097a5024b1a60,
      0x25e3094f6edc4a3ff343591f0af4cce533067ab364468079a7a6d2322a15a0d8
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1a0b54e2e15dcb48ab9ff44c283d17bbbf279e29a86b377a352d7488cedb53a6,
      0x108a5ff5333a7970b6103e5d348a44594415e55c548ca492f73ac72e196c0ee1
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x266a725439baa4a58061633784c7539eae8b4c3333d633b16ceb4b709a877b7b,
      0x0bcb74a94d802c437f07e0f8f53005b8a2418f3d69e2b3e24a83e241947c91fd
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x05f183177e68ee74ae0a1ee9c92884665a6edcd712fb5c7f87312df516c8b358,
      0x234389c32d8d76307016c2d9a0e6d66dfbfb06966b7b89d3df28d4fbd191d9f4
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
    vk.recursive_proof_indices[0] = 34;
    vk.recursive_proof_indices[1] = 35;
    vk.recursive_proof_indices[2] = 36;
    vk.recursive_proof_indices[3] = 37;
    vk.recursive_proof_indices[4] = 38;
    vk.recursive_proof_indices[5] = 39;
    vk.recursive_proof_indices[6] = 40;
    vk.recursive_proof_indices[7] = 41;
    vk.recursive_proof_indices[8] = 42;
    vk.recursive_proof_indices[9] = 43;
    vk.recursive_proof_indices[10] = 44;
    vk.recursive_proof_indices[11] = 45;
    vk.recursive_proof_indices[12] = 46;
    vk.recursive_proof_indices[13] = 47;
    vk.recursive_proof_indices[14] = 48;
    vk.recursive_proof_indices[15] = 49;
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

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x3Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 49182;
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
      0x1a4843f6cfeb71372e001a33b38004d2e7f426c97002ce1e70330d8ae85ff469,
      0x0e36046d782a9e893e4b51d75266f16173eddce7b872a0b79e601b42966f83ef
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x08970cf45d17d6b8ab98879337ac58b286416d26932408864c9eaca6350d3959,
      0x0942547686ce562d0efc5040e10db387293c37aa302e10ee0c733e7f53c90ad5
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x001fd04742967d4778d8d77cef098ea93cd66756d3095903929d3a396630c121,
      0x157472860e0a8d4b89725ff7efb9e3412b9addb027c1321ff20829b330f668f4
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0be7997602aeb8971bf6c29dc67cc475b0585cee3a1f89e83b98cdc5ca5c1849,
      0x136b4bbf633e56dfe2a7b199fb875353539eca10cb63de6a5e20d12793ccf1fc
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1b92173445fea448332a39c107697689c4c3f5134d68204b8785723eeeafbbfb,
      0x0cc60e3724def4d21226a285b93c6db9a0d07074b69166ed0c1440e229d67682
    );
    vk.QM = PairingsBn254.new_g1(
      0x1df7d60478ff69a2579529e92550a125139a23d705f49b6fb281a99c7518a0fe,
      0x12c3cf05645c00f361898dcf7782734bc75f8201ef4cd54fbf5361838540479b
    );
    vk.QC = PairingsBn254.new_g1(
      0x1147caca34240bf78a68347dfbce9d5e97f33284c84e828e173b6274609e84b5,
      0x12de4b7a95128e058b061ab97d5984cdebf3f8ddec759682fe6e0fc97016c8cf
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x09d48cb7f3d112b93a204f7dd54127e22dfed7a5ad19609773e790a252effd54,
      0x178801ed6e5a1a384e4fd4ca80a43226d0db9d6c3fb1025466d44c422f58121c
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1da60f22a6190cab36970bf7bb1880fa3c1c5d093c6959a8230a257cd497652a,
      0x2b4d80e90f6cd29a31a19ef6bb4fd792db1aae7e6758c6c7a4ce63d71de501a3
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0eef3cffc209020811b0461b719dfa9bddd4e4ffaba670faa99b24623912b74a,
      0x0756edcbb05e0ce283fd31d793ae22f61690a46158435e7f5d220916c7ccba9e
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x217cc20953d03507e93114bcc64b3b63062b03c6a5b3b4c12439275b61adaf37,
      0x2efa0207a7842178681ba5fd9fb849cee8ddce696d4b08bfc403b392b2baa683
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x17358c4b87bbbe1845fb65db5f71c83c020650277b893f0e7d088ec80c650ebb,
      0x1f64fb49716582a9f5995ca76759a7217baac960d8357c4c21277111e8a764f7
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x14f20f7d9ec4e95c3d5b7dfd002f7c6129212be37ccd862024b8d885b20d09af,
      0x1c3a1e2c6b046cf11887a12c3089e9f191fe2dd2ddd2ccec66727e30ee749389
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x250fce7a1116f502bd22c544f6998b432b28242e71be03c5491a525a642eacbe,
      0x123ac4bbd78e82042b4ba888f66a3862b80db11619b7edbb6bcf7eec35d0bbcf
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x02bbe7eaf92503a74a9b1d67ca2db31a12fdd1823070723f33de184db7680e4e,
      0x0ed86ca4d546d4993c4d434f8a04b44fb6b31e43167a6956859cc051e3bdf2b6
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
    vk.recursive_proof_indices[0] = 49166;
    vk.recursive_proof_indices[1] = 49167;
    vk.recursive_proof_indices[2] = 49168;
    vk.recursive_proof_indices[3] = 49169;
    vk.recursive_proof_indices[4] = 49170;
    vk.recursive_proof_indices[5] = 49171;
    vk.recursive_proof_indices[6] = 49172;
    vk.recursive_proof_indices[7] = 49173;
    vk.recursive_proof_indices[8] = 49174;
    vk.recursive_proof_indices[9] = 49175;
    vk.recursive_proof_indices[10] = 49176;
    vk.recursive_proof_indices[11] = 49177;
    vk.recursive_proof_indices[12] = 49178;
    vk.recursive_proof_indices[13] = 49179;
    vk.recursive_proof_indices[14] = 49180;
    vk.recursive_proof_indices[15] = 49181;
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

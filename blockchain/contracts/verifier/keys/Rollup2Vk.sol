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
      0x0a9c50d52b9c09970d7d2eb088e0dd3eccda4d19b04e4652552dbe7f77c4e7a2,
      0x123887973aaf13af427f96091888d747486136ba888f3fe84a2b8ff8ab8a3043
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1d8b5b87028aea48487c9a5ce44b298ec2e3d3cc4e7d8450e9713dc6569d6c98,
      0x2fe2c5e2d0c7b8a341e605ea2be3619dd8eda59718409937347c367ddbdabd88
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0562172b27cba49716d19cc6603059cb265e5ab0e7ae18f34225c3442faea406,
      0x043be54c1578c09ae05567eb435a58fed6fe1ef278f755cd78802c77f1b7d748
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x165bcb66b8b75b021d55838d97bbac8ac60f65150ca390b0443620223bd23724,
      0x0fce837b8ea07d4ee811d3f4bc890e5effe8519604503144135f27390b02aaf4
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0b2a9ea862207a3bc74b40a04f6362f5e75c3f17683e9a6ff3c370166b4423f9,
      0x15b6a2f778d62dc08524f45589a77cdb93d72e37599c847d03657a5c92147133
    );
    vk.QM = PairingsBn254.new_g1(
      0x090505d20ad0ee445954617f3ed44399cc9c9224e2e828e4fcbede1495d697ef,
      0x09695e62b1f810f7b769788a4faba6dd0e8e8be151ad9513a78aefaabc4186e4
    );
    vk.QC = PairingsBn254.new_g1(
      0x0258068fa4c86dd1e11d0b535b67e5250dbbd84133e6da4db829530e2d83aee7,
      0x29e1f820a4a08daf1578d80fcc6335e9b2132cff7ef000b93e7f7fdd4c353657
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x24d28a95631af2fedc28c16a59c2022af211cf0e839c5b89739126da313d60d2,
      0x1f744313c784c069afbbb4a19ed644723ce52a059e1eb0505e6270ea2f8311ad
    );
    vk.QECC = PairingsBn254.new_g1(
      0x185fef2f9b7f74d827daef79f2d2820d16afed369b2b4b1ef230d8e343adce5e,
      0x2620e5f9fcd1d9fc51b4ae6365b0942a1bdff37e025b722df557e5be2e888395
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x27e6edbb47935f8f63767b5c0232d1c3b3938dfa116ed2240fb3826be2f1cc2d,
      0x005c729e6f8541052335589eb3e93502e7f193380f1c0a15e3ee649f60a39527
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x134559a4414f340e16fb178521b872991bd85e4667dfe4460a6c505b0f58c3d2,
      0x16e8043b307bd4d025ddcbb6642b4ac9570081ffe739624a7e6642432e198e8e
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2580259c909c4226faf67e17f733631a70cf20243c15ad7eb367f484df77fff7,
      0x290650d67f4a725ec396e83426b4dc4f6d1a0c9f6c01f70e489a15b862b43a2f
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x19d1eca3a62e746a9b269c6384971501b1c27db99cda351e11322ec536c1a10f,
      0x11453538d838450869086e5ddbf6ed7c94599c0a2307417250a0d5df96db87f2
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x27ef54fa2810569c92189066e6db52008e79b8f42cfca0bcfda7ee8c31d2b896,
      0x10a622c36c399bc21447ba7b7b475bed8181156370ff72a198752ed03b7aee0e
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x15bec77f1069409db5871fb514d94c9a5db7c393a51f5c83deecfe9e892d7638,
      0x0b3721a4fda4173803da519005a8607f4069c096e922f87c2f290071cd9203fd
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

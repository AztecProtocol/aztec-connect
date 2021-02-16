// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x4Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 1566;
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
      0x2886d6da18eaf56e54fa980aa974848df26c1b11328c4ef13db1477b1b94eb44,
      0x1b8e611ec27842d17bbec836cdceb47dd199e56b24e89495eb0ecb2787767b6f
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1d375ea6af177226ae733922f2ecfe89f188797e41cf88f34fad0d079795bd5a,
      0x1523a06c426ccf3bb94415af7343311e325a2fd81792562721fd6d4071ce244c
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x18f8e63faeeac3bdea214cef496c86157129762b084cd998b58996e2128c8c23,
      0x0a2e09272721a3058a18e67bbdc3ed692077da867890218521942b2843f98331
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x057d116c25cee4582ff5d8abc4f513762c14c85f52391a74c77cc3278c31eb0b,
      0x0f5b614f99639ae163fb233758937728f1a7a8f6b793032bee042b7010104c58
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x01209c83527bd3b7cfcc84f773aabc98dfdf8219f1b815d767f5545393c2e991,
      0x08b2898b0ff93ed59c94fc8163c9cdfb70649a5763a65081d4101b5fa8dfbd19
    );
    vk.QM = PairingsBn254.new_g1(
      0x2a25af73d1d1e18e6996fefd4c93f131d822bcacc697cef6a4e01bf7789bb6f9,
      0x2cd7d2f7991441dc21a9e03433c71a4472397cc6d26eab31b736c733f5e31cf1
    );
    vk.QC = PairingsBn254.new_g1(
      0x00134df533d1209c3f8b35d7b6f80d12409ef64606f626a25d008d2eeb95b664,
      0x03fb82850e95de970aa9630117da02308b1b9f31c3ffcdc2185d0f73a20ddef3
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x055c5de129f19793389c3ce9b5a3ccb7cff247cc10d730a3b49eba7706081221,
      0x0cd78ca48d4076ca003747875c01c9ffa971ca8bc7128ee7aab1b929b67542ec
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1d76ab4aa28048497fc48229c668449f3bbf7948cd12beb6db95b2226c756b7a,
      0x0bf05f0416a2076ee22c907c2f83e89f51692ca20e0110a06b2c6974c43f9995
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x23a35b7851a65fe59b1875aee30de567ae76104bc64052761f714dfa003602d9,
      0x22e7293cdff7bbf4a494781be5a653c559137c0e5be22c0d64adcf03242f457d
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x0b224dd5b9e2a0382044e7f4a7da069e36d07c9967a6374bc027db3f146c5970,
      0x2199763b1e7108835424f82c983f16788a9035255a9cfeb89cc82be44e617540
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x08ae072fc1a74e9076fbede3c25b1311ea90a36ae2f8901d17db2e91c2b13d55,
      0x18501b839feb78ab86be66c1692e632b291dd2f787fc608cedef72b82518ec4a
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x06a191b32eeba7c216ac90226f63c95fbdd63fb8d1aee1c8160a1ea2cd7ad716,
      0x27d546884b4f03112d9b9d531368db595f9230254d7b271e53e9725516c063a7
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0c700f983ced4110af8522566a7c7f205e36662707f38a16179569ea5bd04616,
      0x0f9be9c13277ca1a16c2b2df9a4e0c5e604e335ac298ec0a2a3f258c7017685c
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0b99277f9bfd5eb404455223a06ad065a539e7086c3f92ff4429afb86be4576e,
      0x08cff985db0b36a0286afb230c0c4b8b4ee093ef858029d7ad0a73e5eb2669af
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
    vk.recursive_proof_indices = 1550;
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

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
    vk.num_inputs = 78;
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
      0x023536ebc9207152631680b97eacda9f090e15d927368282f4cb2d9badb22cd1,
      0x2ec2eb2ff4901c7ffcf8d40fd72e75345e1e6be9ef3652003d4cce7618af2ef2
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x26b9e63784a665058dae8cfb6a8f75f8d10581611fe4b7e6aadf424f76f74f2f,
      0x2abb6a60bab3da7436aeadeb859dd2329d344b91dae653a0a80bb48b1db161ec
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x17e4abf049e3e6e332bf0bd8c99f801bb7d481040f11f1e4045061ffff6c00ba,
      0x287819c46eaaf1d3de57de74abecf6a7e804faf275c0c01b09b22a7977e77df6
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x10650e97ac82b3adcfdfbce65ea2338b7fc7701ed67835c64491a1bfc6b07d24,
      0x108f74889de986beea937e3c4fe4d29e0411cd320dd7024d6b47f6e0904c858e
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x02f939b0a08087c11276601ac34883f3a942b2154deff5d23c2b6cb12c1ea42e,
      0x26bb3a44e7b090f98ee3a3b41ca7489df52528ff0e36db36d7bc5331d3af178c
    );
    vk.QM = PairingsBn254.new_g1(
      0x2baa2c2fd2a331f4db11e3020ec6c907c6acd69ae4d077861e710c47e4e2c01f,
      0x265921b50ff5873ece42c0a5a2d66c8a885e362fd81319dcf540ac67c724c679
    );
    vk.QC = PairingsBn254.new_g1(
      0x04c83e1ba16219bb7b1cb811306c0a38ddd0b090019a4cc4636e1c47e4173a20,
      0x1b46e8218a36fa90e7a173da8907c5480cd7fb573c2af544335e8380c70fda94
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x22565bb44cf4e6db0a18a5b1b58dbfdc04bd16ae53087fbfcd9bae2a0fadd466,
      0x1dac2852b0b88e761a315dba54be56e015e92748d3d7695a1090c986a406d667
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1ae58f95ed813480b304eb0818f9e93834fda05ad5b4c8b52bf32c8da1362b06,
      0x10d15cae1455c8dd8b28bafd1953a7e72614e187effe72f6677672f915c9fdd2
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x134caff7ce8e1d3aa40193db5582a87fff33471f7c71775b55c4125034b88ba8,
      0x0c667c7bc5971e82f91c0d9b0d425ef50de377491994be2873e73a7779ac2b0b
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2ccd7be1fdab3c1eb23a0463fa3cbd49d4f27a6ce5d547487541d2dc5675d3d9,
      0x0afe6fc2d5b7cccc61a5545b65597b95389861fcd7dc6b64eb3b8bbbc3c24bc2
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1fff9381f4072a7cf2dd0729e53b78d282cfc0d3d03291f3f8fa30409a2007ae,
      0x0a56b0f22b189b1baef8d43a2c774711dda394937e4ac6d213b61d5aca3ceb66
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0bcc2b3212c6acc27d487963267b0a76a84c792b9c07c2e1a7a3c035c8c3d5fc,
      0x19cad00761260c00880fcd2980b1ea052f47b373b740a82fa112bfbfee294c41
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0e8b724b3f903d536cac1387d42b23ddb7dd6df3eb39776b7d8d24fc9f02b729,
      0x1dcaec3cfbaf9a64c416fa5b7ac371e136fa4d656576638bc4eb84b2d1938764
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2dab7623571206eb7377f312eb723f28e89b11b0d78e011976c309e0e1e11c7e,
      0x248eea5dc61797d8b3c5d293d976e4934db336dc7b667039677b195b2174d9bd
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
    vk.recursive_proof_indices[0] = 62;
    vk.recursive_proof_indices[1] = 63;
    vk.recursive_proof_indices[2] = 64;
    vk.recursive_proof_indices[3] = 65;
    vk.recursive_proof_indices[4] = 66;
    vk.recursive_proof_indices[5] = 67;
    vk.recursive_proof_indices[6] = 68;
    vk.recursive_proof_indices[7] = 69;
    vk.recursive_proof_indices[8] = 70;
    vk.recursive_proof_indices[9] = 71;
    vk.recursive_proof_indices[10] = 72;
    vk.recursive_proof_indices[11] = 73;
    vk.recursive_proof_indices[12] = 74;
    vk.recursive_proof_indices[13] = 75;
    vk.recursive_proof_indices[14] = 76;
    vk.recursive_proof_indices[15] = 77;
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

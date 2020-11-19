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
    vk.num_inputs = 62;
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
      0x0e08373997c05f5fb479ce3a39086deb1243e4fcb0c759d65de936dacd77ddb8,
      0x13449eb4d9e7e73d8c2f016c12b26903446987ab1231693fc238ce5702b3cc80
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x17ec2d2d61e2eac512fd1c9ac5d37ef6715efe8a8cacacf5549bbb3a6f299907,
      0x2da9b6fbcbf313c100a9dbcf92132393f97065b23dd739164fba31244d50c4bf
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0f002fae4647fa71ee35785e126f8bf2bf2e4dfbfe10e25ec2a3581fbb85912d,
      0x2e995ba477a7dc0e76b47cb2f393e9dd100b865c18829199c4b6c062e01b9c92
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x295bf12b5b50687eba80048dab6a8dbffa4977baedc35b3610495eed4d069ed0,
      0x1e85130f141bed36c0b84fc623d487db6f4e13981135d8507cc5ef81d7d88f7f
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x27bb54806897d206ce388e21dd3c46b899a0989d595e22dae5e5c025c9f0ca7b,
      0x108784258337b748eec7e54161a1276dcf406812b1a921eaf9307be4923e8cca
    );
    vk.QM = PairingsBn254.new_g1(
      0x05ceb4112cd7f276f08746d89d5c473443e76370b29d442f3183ed6cef486c0b,
      0x1ef32a974748e4a4130b8664324b7c792274125341e2da0be27e427e55354920
    );
    vk.QC = PairingsBn254.new_g1(
      0x157bc5c560678575c1713b91ba68ae748911a9673fb27bf11fefea41b4f6ef7f,
      0x27908bf937a323adcefa911dcb028e2dab455a990c2cd81c59c68dc06738f6b8
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0bb991cac7bc4c3e5866fe7870a27684d3b6014b208183ce32866bf3118e9564,
      0x0eca7e6a0996ebac572e282b7d10b1fec11cc8e6a433a8bbcc62d0849b0fb5c0
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0b9c1372b4161a6d4314c0ed3ca0f1aa4b30519e7cf230369d977e6df3b4f8e0,
      0x27826b7ee3c3d4268366ffcaac13560386f618836ac120567d4154486dea20e1
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2cc6713a549746b8ae19263624d8022b97628bbadb2875c97cab571dba6e029a,
      0x2858fdd210a8dbe6965caa15768ad819de0d589038b9f0fac07063960851250a
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2e2cdceb2265259f30bb2446020d37449aa3e0518add40ec389810d767eceb69,
      0x287c896e512afd725dfceeeb33f3fa64be60cdf9099194b2a34951b9ae881c14
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1521769eb37d4fd6bf9f808a79ebbe1a311f03c5f24d44d5dc77ea441df76545,
      0x25bdb45b515b74de7909d6896dcb8c9b5847bd789b5323ad3de348b92c843f8c
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x27f76324b2b024234a6c98ff7638c437029e907dd7fe676ac4ad376702216149,
      0x19a3c790ad4a7b4fab3134f529fc0a9f72f8807fbe78fc55c50bd5e6b79b28a3
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x25ee54c8e15e613b170b37468912a2075e812617e74b70302c11adaf65eaa304,
      0x01bb67020bed48d98e94e5708a32465cbbba42a9ddf52ac78d8a22d94caa91ca
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x23f77252b11fb424fc4a79c8350996f59794d9f04053bc66690001b66bf9973b,
      0x061d5cfdb5d5c331b9478fb2f0c4f08b59fe8037cb21222174e4ee74c871854b
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
    vk.recursive_proof_indices[0] = 46;
    vk.recursive_proof_indices[1] = 47;
    vk.recursive_proof_indices[2] = 48;
    vk.recursive_proof_indices[3] = 49;
    vk.recursive_proof_indices[4] = 50;
    vk.recursive_proof_indices[5] = 51;
    vk.recursive_proof_indices[6] = 52;
    vk.recursive_proof_indices[7] = 53;
    vk.recursive_proof_indices[8] = 54;
    vk.recursive_proof_indices[9] = 55;
    vk.recursive_proof_indices[10] = 56;
    vk.recursive_proof_indices[11] = 57;
    vk.recursive_proof_indices[12] = 58;
    vk.recursive_proof_indices[13] = 59;
    vk.recursive_proof_indices[14] = 60;
    vk.recursive_proof_indices[15] = 61;
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

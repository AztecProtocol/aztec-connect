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
      0x0f96705065c6d6a6997543f70a0da499a4765dbefa51187b406c7c9359657c35,
      0x1b4e75d592bf87168e5897d5471543d1a8f0b72994d1d3fc8dfa3fd95a7d94c3
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2ea92974227a16367134dedfdf604fc680baee39f47c449600a53dd25b8704b4,
      0x0f55c98248ec615de109651bdc58c9553d6d3890e1ba5147ebd7eeee25142a01
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0af84137eb672a1f8b45e2e062a939617f74fcfeb5e1cdc8a2c6182f7e1c224b,
      0x03a50a7ea2daf4e08ff4d759709496c7e72a975874043160821a631196af4c30
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1f0261997d401df33ec31c101aef637986d28048147db7b947a00998a6daeeea,
      0x040cb599c5278b657d14f316cc6c536173c16f25083e6aab49bbc0d6a3881c39
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2f1a7644fc573f76d253309af7c18e432e3bc26834c2e1524711938c68fe8392,
      0x093a24dddfb0c5fc6a6f3bf152d6804045b8959e2092c0064cabb8dbbc55e592
    );
    vk.QM = PairingsBn254.new_g1(
      0x2ccd3449b75ab08751187f8399a6a69b264520e6dc28926aeb0b96f733377a02,
      0x284a2ec2c4e15b44422e616b6fc6f3d1d6ec1afa0c5ec370e8384b9479f7abc4
    );
    vk.QC = PairingsBn254.new_g1(
      0x07a4976f18ad2acc28165dbe353b36de702934d075121987c27fb4d601d048e5,
      0x075f83e62c6f825a13262094480ba6f36641dfb21c068849dec3e0c5ec627b6e
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0269cd7f67ed57e4add106102c17ec58e76a1841826ffb3706661e490b1bd65c,
      0x063c7d78fac32841aa9e15e8d29d1678ddf0b5d049db6aee5875c77274bcbc45
    );
    vk.QECC = PairingsBn254.new_g1(
      0x23518f6c8619a8cd9ce53327d4cf33cce982c600fed6e45666f59dd3fe41fa2e,
      0x16cb64bb5bca158132c0fc70037197fc994b13f1335190511ceead3ea2002701
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1ca757492ac0298a9250b73af27c65842c124ba7082cfe5095cf87c1edd67ca1,
      0x0473cefc0dc8bb2718698228b942028bfe6423f98a7772a66412255c2244e240
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1bc74ed434c9702ade9dd13476570acfb690658023a6feb38744253b1fc318da,
      0x151b0dcc4c4b0ddfb0717c8476bdaffd64c9d73428fe83d422c1d011035e8ae6
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1c6769ba3a0d6bc1bf75b9bddef07733dff174d0362a7005f494b3740ee694d6,
      0x20dcb0adcbc18d86311d0b2271532ccf2a7e96b32290b3fbc4d580676cfb8082
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2ab3556ec9a9bcd8008a3177925062e15fdf0b43e5d961795997b7cf4b09830d,
      0x2f6ffcb378419618e7043643e5de06c45912d81062c4c154bb67f9737f171451
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1a8b03f83205013730931e99211c630db95a145e1dc063347def3dffc047e686,
      0x18d77941fd69b2ba4ef2aabb8b52338792835d7103f67c01d33877d019272395
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x15c47f43caecd4ca392f541db65c2085e82fe9276921eb05d063cb9a4eaac42f,
      0x0c5ef0d4d15629ab314ca7ff571b1f89a5677fbaa7a647fb9ac50af26694dca3
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

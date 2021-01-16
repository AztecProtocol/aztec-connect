// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1x2Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 54;
    vk.work_root = PairingsBn254.new_fr(
      0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x2705fead48017f204a9dcf134bac57947c19214d142838769b8c3c143c50284e,
      0x269b15f556ea03047415662a609f265cfdbc1fc0145f7c5d1c73ae0b3d3217f7
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x15c3a2918ae280972623ccedc7005a8dbf156a653e99422b1c436bb816e139ba,
      0x14c50a2b4f1c931ee547639ed084a3fbea1f17066ec6e475b165249f0c47c8f8
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2874a03931ebc3ec83658a4e7a6aea6b6994e8da68e2157af9629899bea0f5e6,
      0x2abfcacdabb3caf0795e4831fcc3146446e2450c427c8937b65edf010fe8a00e
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2dfca9caf50e90d767f5a68b7ecfc82752c6011ba68118c37d119c0c2887ec47,
      0x1e756162543021c2cdb16e083409dd0c3f9527fc73b65d65385eaede78cbbe61
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x00f6c213b2eef0aceea90c27e0b0e350cf36a2a21a712acbb0ad88016310371d,
      0x26716655f12a4bbac00915dee1c2151b8d7b902a68e44b25a26f47a99f9274ea
    );
    vk.QM = PairingsBn254.new_g1(
      0x16806ff0c438bce6c8e3ac1aa61a453f75696b9ff57a9c561faecf23d78de24e,
      0x225a04ec57f47dd9bc8efc07a438984862da1ce9433e993f27566614ba221e0a
    );
    vk.QC = PairingsBn254.new_g1(
      0x29368b7129690d849f3437797c7ccd75d3a92c518cae4798ed369f3e9e3e0091,
      0x126ed9d5a05b5121652946c8d99616fa4e7d0fb423a178cc1549a7ebc5e2a390
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x1895ef1a566f21da8c95b93d8ae3c0d920db7af590f6c41df2de26c11c7f3b35,
      0x01a13a95347e23143d52c8c95c80d176fc812685e0ddbe5ff10b7343dce4c61f
    );
    vk.QECC = PairingsBn254.new_g1(
      0x104c7f7665488130081554fc5a7d159133633883c7480dac6f841cf0cd275934,
      0x1fd01fec691179cd0d0ef7da9b589faedd2ef9807edaa49aa0c12738ca56ea9c
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2cb448e7dcde5a70a5b0f5fed37843646cfe3512b9246fabbf3e51ec6e75ff24,
      0x280573bcde2d93716237b94c0ae6201099a600e1361de62bd2083fa66256eb31
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x20c4448fc460258023f509d7fd0d26f638f72d46b3a05f54ceafc67a94b29e71,
      0x158318fea15185ea59124d26513e0071ff8766bb9fd7f3b3e494df2cf6220c05
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x27e38b8d2a2bf982391650f02d76b074719f99ee42721a431402d14f53b58115,
      0x0dc2a2e770ec49454e426329b87d1e40194a0cf71994d81c8022ac8e8ad24c53
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2d839cbb038dfe2034507384aff7b60ffa5730462ac6a8e7ebf1aee39148feb2,
      0x06d8e99ae9917991938215a27de38d1433da39852cbd4eaf39ce205d3f8ffefc
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x22882183fa4eabe0a1fd355495783d3d14be1b370253713c3b800dc4839f7d25,
      0x00ea1f1022d4314cf63f889e3c6ba6c1898f9eaf6e3dd5e111435df49518eaa7
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2f1c0cf4c773a654c7b812b95682e98df9285a65dff068ed1f87dc183896a738,
      0x0723e8cf776ca2647854e60b6e88c701e83b99cb9e79645448c50638b6d17be4
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
    vk.recursive_proof_indices[0] = 38;
    vk.recursive_proof_indices[1] = 39;
    vk.recursive_proof_indices[2] = 40;
    vk.recursive_proof_indices[3] = 41;
    vk.recursive_proof_indices[4] = 42;
    vk.recursive_proof_indices[5] = 43;
    vk.recursive_proof_indices[6] = 44;
    vk.recursive_proof_indices[7] = 45;
    vk.recursive_proof_indices[8] = 46;
    vk.recursive_proof_indices[9] = 47;
    vk.recursive_proof_indices[10] = 48;
    vk.recursive_proof_indices[11] = 49;
    vk.recursive_proof_indices[12] = 50;
    vk.recursive_proof_indices[13] = 51;
    vk.recursive_proof_indices[14] = 52;
    vk.recursive_proof_indices[15] = 53;
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

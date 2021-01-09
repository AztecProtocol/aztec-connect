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

    vk.circuit_size = 2097152;
    vk.num_inputs = 51;
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
      0x1e168d1799b7d07d4c69377b5c37e0be20b5a64bbbe2517f3b597eb10ad8ece3,
      0x0044465cd2c0756f2fb1f47afcf294e2277d70cec54caca372b491836e591550
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2002b859485251b457cbf76dd064ce7965dbeeabdaf6aa2d5765da351e2084df,
      0x2239c5c28fed9236c20925077336569041ed4a72511a89be11a212cd0a2116f0
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2e02a69574a67b9949b99025eadf075ae69778dc18c7d68302a2d17b90d3931f,
      0x240457f3842f7c05bb5cae024bf5bf33431ab71c977c3c311f52618b7330ae45
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x03a8d727b58a1c66f347ac4cbcf662a2db7ebb718b94987742388b752390619c,
      0x071af157ddeccf89256e4c3b8275cbdd6d90665081bc445aff81986c532f5e49
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x021277de2672db6e72485118460659116551df576ca3550cd8bdafd8bea620e5,
      0x18f327f876e2bd104d6ad1c85b1b8a0a547f6a94dadc68ce6e75ffce3976e1ad
    );
    vk.QM = PairingsBn254.new_g1(
      0x209dcf012d2ddf7a202a8deaa02ae5a3e7393b5db8d1fccad39e625e86a56f1b,
      0x01661179c696fcf870638ebe8c4c60217d8c2330caf1c8821047dcafa04ef048
    );
    vk.QC = PairingsBn254.new_g1(
      0x041661ceac47d2a6b6faee230fe94335603d04f0825ca132c852f7886d26aa91,
      0x0ee24edf262f53fd05220404d86882c4f0ff4870fa8925f0426a3ca88208f8db
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x041abc18cb69ac67a588842b66efe376c22c0f165ad6413c5904cd454632c090,
      0x2c22ba42b8e394d2357fea86510fc4ba61f1aca5271fd0ef73a9d38bec7bee2f
    );
    vk.QECC = PairingsBn254.new_g1(
      0x00b6c9826c728c220f8395b149643e70801af959acd7c57f7cc3086168ac7031,
      0x0e3ff0491b51376e8a543b51552036b67bfbd736fd72c4fb585c7f2346dfba9b
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x22cefd41b6447036c782854e19d74a1f06616b8220bba6dd395442beb95c050e,
      0x0cbc43548e7b1b46a19dfb6fcbb5d63f516978bc9dd73736fb507f31b3b580e4
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x12f0b7ea475958c52e7f5a60559a925a86b107b00138f547765118485adba7a5,
      0x2a713102a2853753cdb9c8a9aa91decc193221daea5f9b98732fafe31a40a2c7
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x011d2a55f9b68152989280d1245edff67e31d393be129c415696cece0db57e44,
      0x07be3264f5c18f4732dbd2d9d635a4a2b1bcfbd204bf8f945a120d3b9d8418eb
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0d8dc61b4fb0232b0dc3562230c72643cf3a0a3ab4403ac1f407530d2588f482,
      0x13c1bed10204ff7fe1a871a59b8a8905050357a57b154a6e2acbab7b3e652150
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x206c6b044082db7eb197894b9410db7c908620539c955409467cc18cefaa9ed6,
      0x19a83d3a506a89ab978f1af83731b75033521380774d16eb36730fc5ec9556a7
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x02e9148f0b937f0aaead281aba040f4dacdc5b74a6814e268ac00a168396cf9d,
      0x04988282ae2a282a647b543a859c5b4b8a01d385ff92094818c79ca6e791a29b
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
    vk.recursive_proof_indices[0] = 35;
    vk.recursive_proof_indices[1] = 36;
    vk.recursive_proof_indices[2] = 37;
    vk.recursive_proof_indices[3] = 38;
    vk.recursive_proof_indices[4] = 39;
    vk.recursive_proof_indices[5] = 40;
    vk.recursive_proof_indices[6] = 41;
    vk.recursive_proof_indices[7] = 42;
    vk.recursive_proof_indices[8] = 43;
    vk.recursive_proof_indices[9] = 44;
    vk.recursive_proof_indices[10] = 45;
    vk.recursive_proof_indices[11] = 46;
    vk.recursive_proof_indices[12] = 47;
    vk.recursive_proof_indices[13] = 48;
    vk.recursive_proof_indices[14] = 49;
    vk.recursive_proof_indices[15] = 50;
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

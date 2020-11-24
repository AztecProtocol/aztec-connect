// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library EscapeHatchVk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 524288;
    vk.num_inputs = 22;
    vk.work_root = PairingsBn254.new_fr(
      0x2260e724844bca5251829353968e4915305258418357473a5c1d597f613f6cbd
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x3064486657634403844b0eac78ca882cfd284341fcb0615a15cfcd17b14d8201
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x06e402c0a314fb67a15cf806664ae1b722dbc0efe66e6c81d98f9924ca535321
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x06d5b417d31a6703c219daae47878d11de8076b61e5359b542507df926822cce,
      0x1f25faf7fcce8726edd9f009e16937063555ef1a7e2771548e415cf8218048af
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2e259514d57658bc13f9aae52d29e172a60beb4277156e324aa2d0cc7a44bfad,
      0x041345979b7eedc67e670e688be984362a12ab1ce71202e6680c3fd53b4570f3
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0f2c44545adc9be26705d24031b3da7e404031622428a836bd7014e3720de850,
      0x04c35a0f4bdc682f2b4b7ee255eb0abcf5adb40634b3e7e3e6004e79afb44e6e
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x28600748ed3e2a16394afcb5f09fdd80fd3831d7c1ffeeafd89b855fcb47f45f,
      0x142cd1580994e75c76ba03c8f57fc6d48bdc1b7a6391a18e8c748f659c523697
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0e0a7a21e0bdc3f39b81a8e29767ddc549d789177de63c441ed3fe6dd7f5dd95,
      0x003d943d7e528fe093433ba7c2db10567b3c71cdb3b51306f77ec91629025b52
    );
    vk.QM = PairingsBn254.new_g1(
      0x2fb5743445377a249b88e53db29895ed80811ce3ebe2907cf9655a7bf014e8ed,
      0x29de47f6fc74258dd76f7384109f2a65a978df3d0846331b4df4fab0b2b69486
    );
    vk.QC = PairingsBn254.new_g1(
      0x0425b27ede7718e7c70bf329aebd103d16e6b719b66fa077d1597cff6a527075,
      0x16854c000182b259ab8e164a2dbdae77c21dc121a439051dea78bac7fefb6828
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x1681d43679da44b107b230614d8be94a2830615e4f094777f82f2a2ca76021be,
      0x04fbc9c7414f53fadeed69a50df950ddecdbee3c2a79623202fa94f0c48079d5
    );
    vk.QECC = PairingsBn254.new_g1(
      0x08f344ac0317139e162e8386f0a4c61e6efa8f241add35721bd0168ed6b63c27,
      0x147079217e50144d85640d4c6235e3d7870dd9a9fcf55d22d59d3d09a28cd0bc
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x210df1ce505df5776f0655e5424395e7306a1e64268a948666e72f9484f6fc73,
      0x2d56b3dcc4b0b73a6ca675156ba94a4ebc7eb14e3b5f5d507eb06eb162b01119
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x05e9f896794da1ce62e68925ad8ab4678a3cea0b96f6a6a9ae90276d0135f5e6,
      0x09633f263b9c27f71cca61f5ef79a70a594e414882c39dab6cbd50ec8ee0b7cd
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x27701e7ad8b7bc4788d2faec53dcbf152c92fc10d7417b3e39d6a2dc02795f13,
      0x1f946a67079f8abbf472a6a96600844b321da442cfb4c2c659b28d7fc68ce117
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0215a66f2a92b224b2e8297869cd8e95ec4443da88ded4b7c353de8ba31087d9,
      0x0481b133f76d34d4407ea14451f465234b4b1b917486c11a340869222049e527
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0e66713b4a9d0f4246f2f67f32f8c16edf9d5c76a8f7fbd553d965fe3fc5dea4,
      0x0e2d67838a78720fd713ccf6b32e5c6979dd4778a0bec920d2523453965dfe48
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x24dd37ef84d71094f466097a0221bb1744d9e877fac7324144d422265f18019a,
      0x03f27859e37c21ea9c6b00c51686c8c61d9af317842a2bdca1990e73ee066761
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
    vk.contains_recursive_proof = false;
    vk.recursive_proof_indices[0] = 0;
    vk.recursive_proof_indices[1] = 0;
    vk.recursive_proof_indices[2] = 0;
    vk.recursive_proof_indices[3] = 0;
    vk.recursive_proof_indices[4] = 0;
    vk.recursive_proof_indices[5] = 0;
    vk.recursive_proof_indices[6] = 0;
    vk.recursive_proof_indices[7] = 0;
    vk.recursive_proof_indices[8] = 0;
    vk.recursive_proof_indices[9] = 0;
    vk.recursive_proof_indices[10] = 0;
    vk.recursive_proof_indices[11] = 0;
    vk.recursive_proof_indices[12] = 0;
    vk.recursive_proof_indices[13] = 0;
    vk.recursive_proof_indices[14] = 0;
    vk.recursive_proof_indices[15] = 0;
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

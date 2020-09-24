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
      0x2a2fe47e757716e01457feb75c4307c5297f52444d87a4750409cd9af4c5030b,
      0x034b1c9cbb4888e056f75aaabb4b18cd8be685f79a6b0c3142eadf7a935591cb
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1cd16ca9eb26d91993b8e1cabec237bda95ab9a5a1d19ebacce115ffd4245aa6,
      0x1c6f72826385a8ddaa6aa8052f894050924c3b9671d02264e765f0aa36918afb
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x1d7e38ba35fed21704d0451880629c535b917fe2beb54cf6b5719acc7134de3c,
      0x1ef060097c5b5a62833b9bdeb65b4f1abefb17e2b9f376982eb0c2a6f3d03099
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2a8038dcd38c56409d6bfccbb8f16463ec94ee11acbee58c26bbbf0c369a2573,
      0x108002e2c281b41b4415f18991ef80eb1c6fc728ac3280d28afce07f629da77f
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1c4e10b4d3e4489ed0d69204f73f47f4945ce2d92a89c5e4cca1dbb0b3f974ad,
      0x0ad2e6d346b3ec66660e7f6766a9d3850b28dbaf8290124398bbd0c10d0eaada
    );
    vk.QM = PairingsBn254.new_g1(
      0x01ca98d13d2fcf88697c07a0af0c70844f2b0b6de69adf78f16405e11116f1b7,
      0x2e4730f0b76c6cbe60de3a1dbd865b7a04924473ae1dbfb8a1fa55a36f3e62b4
    );
    vk.QC = PairingsBn254.new_g1(
      0x2073bf7b72b7f5144f1c70316efb8f932dffa73fd3d4aa9904c9afa417340397,
      0x143af2658289db81c0d0be640c810c881d45765c097abd4ab0a902ef35f23283
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x1f437f24efa76f39dd226b4ae413548ab2ff6b17f2f3abfe4399995376dc763a,
      0x24d728536602b7ee2c5fda349474c7c12bf85717a64565351ab5727d3b5f1136
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0cef706c86b9d1aaa5e46b12838df1b8a28f96f44197b209953efd6b71e2a1b3,
      0x1798f0742e88c9b29471e2aed0269385c49fb9a5af9e4c67469e25d569553e50
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x286f7d3b9cd4920935d0876a5b124a7676cd0507d90350cb64ee4d0ebfc489e3,
      0x1db8c0cee1b8a6c1552638c1eec77544751281864df1e606474980e5d8608b59
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1e4efcc13a098abc66c186f962664f014d8257d6016cfd6e13a076b6a4b23c73,
      0x13fb89f9a9c6104dbbc331a67fa316b2e5f8c52deaa6b8df6178a3bfc43660c6
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0fd9ce1cacf7c445adc3a21b6fffc4a3e522fe16537ea4ed3be962572f7f155e,
      0x1c832ff84990666c1b2ad9feb6883f2fe2c14dace88fe70924b64bb848867a32
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1311a1ff831f74d3c5d47942115db4085c2c5a8f2e553203d631dc888f829119,
      0x1cf016a5417b3a7c00287931c4f7cd7efd46c5ebdb9b62f9e0f724cea6a46a69
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2b7041173e8864098ec0d98734f5410ceceb27b9720a5081822f30efa5f51b58,
      0x17985376ed6343c2ccb51572af6079d72229216c296bd115e9891fda0b693dcc
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x26242fe3e8f4ca0a19757abbe01b6f00aff1053f32afd2b292057348ddbc4087,
      0x208a4d7bea3887ce9df5d76c14ac33351052b047a122f84933054e9d6811be25
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

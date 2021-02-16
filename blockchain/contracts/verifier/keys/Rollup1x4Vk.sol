// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1x4Vk {
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
      0x25dc3a5970e890c4daa6f3dbd3a3f4188d0999f66041671113f87039afb65de4,
      0x0c9e54dfbb993dbccaea952ccceb3379c358922051fc32dd5c8e5e273ac02f06
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x17357677d8eab1cb7f022c18c08388f43bb3f2d07aa6e89dc66d73d39b707fb2,
      0x0cddf36f88521ab1b428256e6c9e11b2a63bfe9d9117f049aeec6b714577b467
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x07045da9858689e08e73cd8326714b797e70be4810b447f906c77d96fe794436,
      0x059ac2b0595db9e58403c8fadc649e89504f0d6f68ae7735cc3fe384a6ca36f4
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x06d7103241d14a134e31f0acd3ef93ccf51a1358b46314e0cb238a48b155ca59,
      0x11aabd4945658c422f944b319fa254fab6303a0f3fbb3ac39c127a0620c04125
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x13435d57fe4342bc4779b1c1eadc3ab4597ab754e1ab4e4779f6c0ecba88a687,
      0x185b2abdf67ff6900e7e87f541706d4c1a4b3e5faa009ba7e9ff885ca2c3800b
    );
    vk.QM = PairingsBn254.new_g1(
      0x0d11c50eb658a8fa1faa425ee2def281225ff4d14a1a35a80dd6a2fc1cb10855,
      0x144df6bea9b59c383c6ed7ca7b390a6864c5d1798c20d028344a7839335b4030
    );
    vk.QC = PairingsBn254.new_g1(
      0x2a0a0d17646b6cb3391be7edd5848a670fcfc485be3db3befd69c5a9d7d17e6f,
      0x1b52492f5537986aaaaad3715d35b3630080da989db7b17c926716f6f26ef9f4
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0e9aaff2623c4dddb802514ef5e99dfbfe34819561a012bea365994a58e6fce0,
      0x0a5392b4570bb126f551c95f5ba48f5e687822345987c4d61cc1870bf1cb560a
    );
    vk.QECC = PairingsBn254.new_g1(
      0x077420e28b964721a58d2f8b676db09770a14ebe405524eb786ef471299bea0c,
      0x2ec87e355ea9a6fe661e129945fd4c05d3cce95ac2dc32c766a54fd4565fd995
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1ae39dfb496a35c9e413cc9686165a9fb5a3b688bed6e1ae85d1ba57d633794b,
      0x2de20f8dfb87c84a222f107f881a814313a5e30c7d0b63385a45a98d895d8175
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x00681ca5f0148be31656b3ff29af8a6b03569c9f0addcb9d41a4e7d6b7106b51,
      0x0bd744f3059f7ef8d645a8d6204d3c12d008787fcd36c0c4eb79779bbf58a57b
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2ce9227a023e4d481fa024381cd0f0b3efa79f84a5ed2f037419cc76f71a32df,
      0x1dabb3d66a53247df00cc44884363dce5eb28560cf9f12c53ec20be89ea828f9
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x293f7d66a6e3df560428ca05a0fcc405701f58f3759f8fc0a523ae345c9438fb,
      0x0028438916cfc9830feac3d201a57d67e0699ca5a647cf4acfff831f6cbe9343
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1b2811c8fd1e250ee63492253c64e4046c047e3488f1165bc976f0329f3312f4,
      0x0cd6c569dfe91925288b8de6f1eea5de6bf60b37175009577e8f5dfabb14b5c3
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x105081713faf7448d2a520a7389d399a4352a7c3568a357aebb2af0bde4a8bcf,
      0x0498bd3eee620712c4a2526cf1879c44db92021e3b89392137359fe14f04f470
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
    vk.recursive_proof_indices = 62;
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

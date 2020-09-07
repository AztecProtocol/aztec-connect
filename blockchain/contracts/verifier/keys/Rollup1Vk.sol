// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 37;
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
      0x2a001c0b9b404ab1d624a630c50eea434160ac2fdc1c47b0fa20f7e9ca307a31,
      0x1f0b1c1f1ab8fb71daa8ad3ebcfd82d586b8052f777b2c2a4f68d7b5ee9d0978
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x14f65cdb9e65147686d06c168ef0357d8bb473549ca2dd6945b428865afe4d63,
      0x1da45648e26fc79bfca9b11f9781d03e6fdc36d18521fbe8b5a217b7873d36ca
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x142925f53229a335899d4887825cd35814e7b07f18daeecc959abc5316cff93f,
      0x29303349e816214aeb63f0780c49e47d41c4ceb9f219d9b7dc4666bf94c89e0f
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x036a2e89198b895d98cbdca3bde8173912f543a16ad4c6e9f9f9ca40217c721c,
      0x2cc173ca9f38faabe74202c237daa382d8f583f6f74b25804a809abec7fb5ddb
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x25184ffb1a2b74bbb4eafbfea874197edb910b5f7a2a457468798c95c1e59f09,
      0x1aed2ec97978d9cbe5abd555f8fff18788171631c7cb5edb57c35d4c642bef3c
    );
    vk.QM = PairingsBn254.new_g1(
      0x186fa1f6a007ac9e17893a22ac6715a602ec84cbfef8d8dfab9f4d1491422cf6,
      0x0e540e5ba921934b0d7b1af9ecb475388347638cfa616f1665aaec4fa161c8ca
    );
    vk.QC = PairingsBn254.new_g1(
      0x2d60d70cd40c5c5ee0111ff8754424a2fd053252977f2745fc2f2d7bb18bd50d,
      0x2c4c772a84323e046d4ee350f26e973aad4f30719f9687e221e66a4fbeda7fe7
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x3003d7a42c77cba1f4dbc4886cc620377275d735bee06ac5733abd7665c2a6a7,
      0x163a254a7256c0ad6183269462182e61a1b5bb0175850d6d4c800c1abd3638e5
    );
    vk.QECC = PairingsBn254.new_g1(
      0x122c33355227cfd3fdca36be240debfaeb5b27091a4aa8f4778af9c8205dc8eb,
      0x24d9c4bb66e74b9647e508def2ba37286fea45f72c0b0860498572829918b744
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x154599fdd17a278bb9a70dfb6d86fb562980d3d8bbf7b96890fcdc73bb637b1c,
      0x1bb17fce49725840535c4d47e108989a4b2bc6f502068f40cfd5748dfac4b39c
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2ebc30679ea62832f2124c02bf9123bce797df3b385dae08be549129ad964951,
      0x044c9360eb9b9dabb8036b8705871be4b8961c5864c1c39949b2eaad1d8f046e
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0f1f118c02cc785bbd47c1f5d4f7b79ede05c85a8d7e96098bc55f71aa5bc99b,
      0x1e5a33e5b70dd1b968e7e5e72167efb22e730b0c199cce9d12516727f05aea85
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x19a062f5639ffc18abd81119060dc27a3571e15125025ff64cd79b5c60f361b4,
      0x253764aa804d304b96c511ecffc23f210a1438829e2961ef454012bcffe78ae8
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x242db8c5d77bb21c491e556c68ab1a33b4f9243abd0e552d481b985099077ad0,
      0x1bebd9f288d1708764f160a1542c7b3a54da0f4d77b67db015a4482696b3ecfb
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x08470fed9a6439212b1219ae82a021b8337bbeadc571ca2e7cb9610fba6c63f3,
      0x2ac6ad765b52ee031612245349098977b00febcf5f1c02801935a3e929972fe0
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

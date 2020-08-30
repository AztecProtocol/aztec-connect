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
      0x2454863acd825dd821633f39bff72ce6c6e4ea4df1b866b13fd58bc2d34cdc38,
      0x091194168b7285d680cd6ac553cfa3c1b1810f74f9d9eb7cb17d93c513c7c75d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x3060e597cf2856e9b6926e8b0fecb5d3301fe9f605ae90f694a59bec861c1b92,
      0x137ece946f73c659e148e04995dfd0f24ecc3dbc75dc8602f9f401eeac6f5571
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x21aec925d7e8e82be455dd5360e74ed3b208de6825f02e3d0c74ba2906cb6dc5,
      0x13f6e9ee3e0e5589ea7bee62deed65a1b8c5b9ab0afac3ecb974f2d37e280c3b
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x101f91a647878789f4139901b4c82e82fe85c37a2a357abb0caad0ddbc0ee3be,
      0x103361536f36a5a867ba0db12af2b3fe6aade3b4b00526555e18f0696892364e
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x218d6ea96d89b6d4d92a1c384abb268742095e968fba7075ce901b80e6346797,
      0x18abe1b694434c823288178441a13c13d09de47d6660d211b6b4f254d825f435
    );
    vk.QM = PairingsBn254.new_g1(
      0x05ce15e1c4279b5b2eac3d1499d4e914dbdabd33d40c8b1c30565f556c77f8a9,
      0x15a0c2dac87e8735f5f91fc4086a3f428c7bbff2009e37c28919bb06734f697a
    );
    vk.QC = PairingsBn254.new_g1(
      0x060ab47b32b0f89b0b956a07731b1f841b0040bb92b262762edbf05bfa3bb032,
      0x2cbeeca79d5cf0e60f5c9dd37e8f58b0ff22e8325f947d70234e80e7b754cb65
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x22ebc59a7d932ae74c078c22869700aa74b98ebd7fcc3d5b8de50e606dec23f8,
      0x08e70c61dec6994df49223d6ef7a3ba005718434371bc3590882bdae00efbc50
    );
    vk.QECC = PairingsBn254.new_g1(
      0x132c7b49575614dc55556f0c7d6bfe8fa0e36ff433678e5c84ecd34ae5eab69f,
      0x0a2445b0312c39bdbc7281bd5c67009a773df8b046f4a18674add4435e09d703
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1a7ac7f10f29290f33c221c03771f4f500f749b8d78c9dd47ea78b50ae37b875,
      0x1d5fe9091211a5efdcaf6148217a696f941f0f9292472b27ac080757e775d6de
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x11f82c5bf32a1d3fe414c4bc99cee7a697bdffe1f57fee69e60eae2a0df74222,
      0x239c5d74c17e7245bc9d56751598799407f9f2325e5e0cf44da48418d7de7171
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0de25770d4b45a125e3d3e3dbb2c8aa5b3854f9e4a5b0a00f357d7fd8f50c1cb,
      0x2c0fdff8310c6325b48461a0395f34c45893dd4f9bec1710df3a104677935416
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1cc62f629a20a87781b880c84cc0ae6a3947636cfd73c801b8af24f693c51e95,
      0x1174b9bf4208b1d5678ebea3e164884f5868cabd9cf00a6889400ffa8e5e9fe9
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0c0c5f9026ce71ac8a15fcb43ef2dd7ac50e543e88e69d8f2f3bcbfc75caa250,
      0x1b2499560c71ed211bb9430e2b81cabd8a1a717077482bfcfacf782028cd266b
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x00bec06f5448c9d4d86c8e8f138663f5d0fd9aa24cd88ae580a3386320698ad6,
      0x212fdd9e0813410ea06607293e6704374b93ad82547cc9898a697a832df49c18
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

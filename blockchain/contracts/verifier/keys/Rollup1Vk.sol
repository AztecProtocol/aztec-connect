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
    vk.num_inputs = 38;
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
      0x035dcb037300ddf65edcb118aee724b31b8dfe18875ddda480b3deb9e0dd0252,
      0x2081b9871790319dc70cce98d472a13ce505323d926d5408581a1e7792ed271d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2518cb243828cd751e3c9dc355f0cd1df6f280a6e60b2e63d52dd999bcbbf139,
      0x11bcb7cd49b3c4efe0f00e87bc1f2d2fc0ae654c8b4ddf8e417fb41aca9f21f0
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x21c7fd8d3bde0cc359b77adbed4943bce3991c545e056a309ddd8025f2a0685a,
      0x013e1bd42ca61730517f9df8bccd6143a2e2e8dccc1f740260311d2350f3663d
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x10a7e4752cc8dbc6a02431db21d33ecf9688d62303da82fc343943a6a1c1adc3,
      0x2ddec8b89386833877b29a82e8262396db61cd73d6a5eb85bf4f476d4b516901
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0f051da142f7c7666f8d1eac6d0c680b4632a51e1d50e0be1772da7bd4bf17c5,
      0x1ce461d18b2e1dd938c73d8428d68fa082e8296a7bb0cae892589a6b3807d04e
    );
    vk.QM = PairingsBn254.new_g1(
      0x165885b0bf611c304d2959fbd65cdb24f38f36c12142cba865ccad30392c7072,
      0x14d873e56d017c447c74c3d6f90ee3938444df8d83975615685844bc56559701
    );
    vk.QC = PairingsBn254.new_g1(
      0x27bf3cf28bbd2e6f5dad27f81af280900179f3edcac651ec0c18ee26e26b46aa,
      0x247f70a91af18cbefb40eb8717fe57b1e27fdb7ee545408e296268c2d640c1ae
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0c5c09a4915dddf47563fc840de3ec06905263c79cb422645349d0eadc15e924,
      0x1b8e3bba4837b15c2b17cc15ff803d44a79aef483e8eb45a0211717b3f447979
    );
    vk.QECC = PairingsBn254.new_g1(
      0x25bd3dd304c96e6314128a29583f23d23fbbb7ed221a2deac6c787acba58e8cb,
      0x0e040433a8fcaddcc73c94d496913fc4227c36aae9d5f3f1c4bfb3dc024201a8
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1e5181164f7773ad73766cbd0506eba92090aa36cd1abca0370f72fe6243784a,
      0x2d47446a5876ba058d113a801a79f7ffcc59609f25f52612766959d67483efd1
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x10d9dc70b25638d86089a23f6d4be8a179a13051db8e3a1caf26d6e3dc46bb49,
      0x26165b5a860c8b9ce4d8a4bb5f7bced60e21cf1f5a2ad66add1ae72ba6c1d826
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x162a8dc7244864479ac5bc7bc30c29d7e8e45e6cdcbeadfcdb53484270c8091f,
      0x1144015729f34f699b3acb130a2b41e68923c2abea31f0e42086eaa2f22b3ce6
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0f84c0192b1553f48797dfb3e4264d1e9f1890f614a2b307d137212e7d0a4ed4,
      0x1f6de8382885ae954c9f3738c8dd9137ca1acd361ca15b8ec46ce754a5929e10
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x16d60745b25f6631c41267eab7f57c431b3326f03b6a4804a9ea9138f7341842,
      0x15e3ef997801f6641fbf29fbc75853b77e666bd1877eb522192609e74dfd1f37
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0a57ffc57a42f9d1139cc255a4a12464f8037f983c47ffa310cfa1df53bad805,
      0x1e626da1b75e6592f904d6635654767c5156b29f1218471cea93416411c3e351
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

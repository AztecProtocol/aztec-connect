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
      0x22e43959c36757447650f42cb5b8edb2eb1ea447910545771295c69ab374db04,
      0x13ada1959ab107d2db421b5634c63254e6fa0e2995119daafc78d79b0539b18d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1d4a112a4b076a44dd766f8ec1fd4d0e355f6ac496070bc5060f60a09b9277c8,
      0x22981b9f2ad2e53a8cdb5bdea45e4a13c48246c60a44daee1a2d1e474044823d
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x183d6cccaf6ba0dcaf31c0d0404efb28dda7e21709f2dbef8a953c2b228637fa,
      0x2a78c019658e5a3f1a758e9de526f4738ccfd50eed59dd8ce3d1d867e3d812f5
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2169d81c709a9d7c70a5b173fa746dadc87c1d1d0333d1362881cdee314cea46,
      0x19a183e8f257fa1ce16ac545dd22d9b201256beee2f9763942a02e59277b8287
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2e9afc4b3470bde028ec9cbe62a709ee56c676274c6b37a3ebba694eddeaa6cf,
      0x1ffa891c8a091cf0a2f8f0d309af0ab4b836d06a7c140470969f4a9c3870abc2
    );
    vk.QM = PairingsBn254.new_g1(
      0x1a6a52d384e99706c2a294925745299187a982e6d5f968fb01f3858edb8fdee4,
      0x02744e635e9ecac7b8021363861dc5124ded88b13acda4160d8e2dab9b445b46
    );
    vk.QC = PairingsBn254.new_g1(
      0x0e8c1410c7f76bd359760d7cf807c14ec610111fa40129d1e493b6b4a51ec35b,
      0x3052f20b27937154132c6e2a7946588143541189313c9b57ffee82816a02f540
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2e94c49ce566f9cb0dd50ab4915fae69459337beb8b64cac112d48387edfc6cd,
      0x0a4d601813747390c88b4b80199a966af0fd546d6253d5aa879e841f1351e464
    );
    vk.QECC = PairingsBn254.new_g1(
      0x093f920d75c5386dd0c7a67af4cd2c0e6f6efe058287a9af2618b14a4f51afb6,
      0x00ad41997e62089463e557f3a0ad50cabb5a05fb52ac8d5c697e698af0d6b731
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0a120c4e42ddc44f492767bce5904c5e0db5f2c67dadc4dc0569ec0f4e1334b9,
      0x0cd0d9513d0ba3474ddc36063958a7caadb476275569fb28a3a337b3eea5904b
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x278de92aecac3e675af80fedb4b7c0dfd7b861e3dcaf56a7f250edf4e5390ae1,
      0x07b2f1b033ab51c449a55013c1843bb01558be7dac9bc13eebfb2e00fa45904a
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2de0f58cdf11ea2fad035bf9a36147722cf7ce77408e084fc41cb490a8c58759,
      0x0021896eb9c27aafa1a3977690ce0c62a6e279f82b908f10a4cc77fcfcff3a23
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x0b2dcba47eb1a6b3a244851d7fa67525069de6e9910aba9e3385552bb18c064e,
      0x1b598af742b2ed20d94bbd1ebd0c45172e11f3e408618da5ba7f7b812da7c424
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x13d6936a8f750c62e74af4f48a52743f2dc1ee36aabab49299390dc9edc4262f,
      0x1b36b2a3dd9127de0abc6d40ae67e26a45c215faf6a4d52f97283fd11a3c0488
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0b9d29687f57e9d3bd9c2ac1c8dd349ae88960025e577af148da5a8e1abfe2f7,
      0x2fceb02eeb356f8c454b684ee55c25e0e724c50f001145dd1c794b895d7accab
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

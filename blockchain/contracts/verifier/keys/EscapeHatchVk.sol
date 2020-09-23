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
    vk.num_inputs = 21;
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
      0x0450055276e5aa5595e988c4f37421b8e44dcfdd96f997cdd6fb9a6cdeef1c67,
      0x0dd151dc89e6ee758696d597a353221065749be0f1aa1203bbb6120fbecc2bfb
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x01938c821f9d388fc8b24b020cb5c3bbea9bb6e8dbca5dd36dd052989e998c36,
      0x1a66be7d8349e6e59757ad113e98ed0b504284289bd26fd2958c674e37633f7a
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2c6de933be12fbd4ff1ca1d236edfef00203f821af88a236c8e0869d9752e3bf,
      0x2d8977797372652e6879bed1213428e2a54e11fdd359fb93906f84446ecaaa71
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1d37ee4b85d47bdc79eb088f4d6aae752d153f2cc01eb7321758e4d5a515509c,
      0x2cd0489230f65436325e8bba3bfdec9504b7d929765068bb656c0746b50ea05b
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x214a559da7fb944c022ce97db3aeb680c27670ac854732a02bcc3df0796b7ce1,
      0x091fd19e32e0b856df9afae067aa8195220007e4c9455fd3368e5dc40128d9ec
    );
    vk.QM = PairingsBn254.new_g1(
      0x038839ee40cdae4691934ba999d8046127a48f19c30f2333d184c68c13830d47,
      0x16d1103c1e004115af39f819c98495ea0ec34e40954950676d8cdadd5d52b9ca
    );
    vk.QC = PairingsBn254.new_g1(
      0x06b0cdf71ba0b925c60847399da703d70b1a8e349acb7d41c77b0f7c5fd3bc56,
      0x010fdee7609674e481368a82e0d8e03b123b45e4ba90aa9cf2ed5b5882517d96
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2c5a0cacf842d3d86114e628bda234ee48d85255ab1243d99bd10080cd970211,
      0x15ea656cb45481d43cf533880bf0507486fc45b7219ad3ad29cb49f5ad61eb5f
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1cbbd88309edc38705572b3dded90c3ae0843f1f43d58930ed10b54171b25b01,
      0x126bfe733fd2ae73906b359221949c44e9d2b0b9be56c32baa7510885e5081e5
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0176f6e9eb6711ef20069a3b987e8dc419a4bce8027c027aa2e7fd1a1f7273e3,
      0x0928532aee9667779331095da84473547a1ab9fa3a4e44c009fe81613287d918
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2bc8b5c57333bb5c6b26eaae19618d52ed2717086de8577c6a15555c9a2e62ce,
      0x2d80347ffb3d2295f99c488cb1f400d161d6803a998c7916071ae1ea09795738
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2ebb4c743764c121a7ad145bfd241a11ce3c01469271ce2d327134504125343e,
      0x29292ac8b1cb5c097846130f62073e0f7ca459bf301ede24235ad25e6b1961ab
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x00eae8db79b52eb1db0ec570d03ed7d05013b1a7cc79c50eec3d60539646fc22,
      0x2da7168d77ccde45dc3c37490400a586b800d0513258903e830a56c79925ccdd
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1c41ba14f669ac67618bb204efbd2e3760628ed2eaeda020ff69ff1069e03209,
      0x1909326a05a86e8d76fa5a1026e40545d3f0e0eec84d7848d91deea2c58f3534
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0d7a4d2ae4f455630d9570d97856943d3d5fd9cc5c7e27d568d15826063619c8,
      0x29ae63ce6992104fd28708e281ee85756c77ea414d1a36d5e18844dda45e3f85
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

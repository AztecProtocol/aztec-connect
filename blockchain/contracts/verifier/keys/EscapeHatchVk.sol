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
      0x25a62bb6bae8c05b4487ea37181753268e876d0905386422a366a04106edeecd,
      0x1a1b0a56ccdc751f04bd942de8747e7be5f689fb7fab2176ef228976812fbb98
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x123efb4ea6869c0e3c067efc17e73265e2b1e078fd809343f06234cb6d4eda76,
      0x0fb5ef25d82d7c013f3c8b2658f921c030d3b79efec7c807d192786b34cbebbd
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x00e01b279f5f04a4cd035459ebdc5c666259947212a41ad959f756c61480c3c0,
      0x2e8943c5366428b558aed1b14888b447af7e17345c5b21cbcd3daf494110ebbb
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1abc6df3b47a8b2c4c2a2ed7c8b628b59e55fb9bb3909d88e665b6a5310d2bd5,
      0x1c7b97fd515ba9aa52de6364b78e2eaa243248de65cdd65cd142c66d0da214f6
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x118863604259ca9a245306061b406e02e444137b83ccb69adfc113daeb6588ba,
      0x018dcd81778ddfdfa504cfa4d4eaaad518858b369620a1d75ec074e8310e8a0e
    );
    vk.QM = PairingsBn254.new_g1(
      0x183cc96b232d65816e4d58772b4ed84f5bfbdada8267402be5e20f368c0762d8,
      0x2bbb9c80cedd094f3a4ae3d56cba792e64c53e1ac27aafae661d7071ed67ba7a
    );
    vk.QC = PairingsBn254.new_g1(
      0x2f0b0267fd0362443bfd6e4b31233e61eacfc70325fda929b0ff09cfced1a365,
      0x14128c9e05e82bb27c8eaa8528d37126aafd19ab1c18c0910d79650be7d016d5
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0c0bb941d86f3e2b9b85d964e6bd0be5fa98c602469dfa7a841f559c4e00b890,
      0x149e1841d33aac8d15e9b8a895fe3723d205d1fd688c2aecbbfc77ca174f3f4f
    );
    vk.QECC = PairingsBn254.new_g1(
      0x15a67f450e64f010888660d932b54cf7a366e549e408769b9bb1f260a48b0cc8,
      0x0603a8c20e5397b8ba689b1e6a0cbe1f9e9956cd19bd2642cfe06fbf3e288493
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2745a5b1f30c9787b89d3e5b570cfabc9d99b3ee675e821f4320cd0732ace103,
      0x0585071f4cf53f972642253d4cf6f0654c1ef804138e1b4b138d638ca8876407
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2203cf79c5c57cd7ae173f2999e40abddd6932f41c31aead03dd2c9908af326a,
      0x0cd104bd85dba83121f4658d9608a236c3c4e75f3e6093390972132996e7fffb
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0ce16d98d87e1a1479c55646dd46d37ad955ade5ef101433be30b3a787569d9b,
      0x1409c61e6555c3e1e3740a594af3b8f94990dc78c04841fb2dd8d1d36940f01c
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x04de7f5458fd3ab37453bc8ded2bfe541768c3dcee7bddcfbfd8a1a92c405f6a,
      0x13388b2b73cb54513f1dd7b4f8f2095df64c6c4c222b3c7b4251681a2243f51d
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x20953b4190c9c22acef702a31d7e6e553270d52b707271ccf5c7bafa23b3727d,
      0x10134631eb7d238cdc1c8dfe01757f848cba1c4469f08e1824c231ae9a3b5a3c
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0d0dbb7204e2e2e4001afccb695b4f5da10b1ec0e1072ac1561aef46a18ab72f,
      0x111805d7d0953d4dc8258d59586ed77d8bc87fc743d85180ed5314ce19280a76
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

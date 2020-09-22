// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup3Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 59;
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
      0x19c50cd1592a8efc2afa49810b2341896609424f7602d6235bc8ec1cc8fe0975,
      0x10f37bf120f22008009c4a73dcabaeae93234f43aeb33614c941a70bd77b6159
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1af630bcf6dcf79cd01efb8e514d34175be8bab655dcc8bac80c98ddc8651682,
      0x2e8f0b2b2ec0df249715d8198ce844cde5ef4d3a1202b711d92669f8ce534e87
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2bec4f3e2c33f5187d8d9742e1653a57f1c0af2c17dd2c8f6f640964b32a6fa9,
      0x10622d6b0fd0c54cb99ef8fe26723e31b0d27f8c85b15aba424e4607464c3112
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2a06adb23fffcfb6ec3643da1921ef5140866bd4d65d0866aa797823a0b87936,
      0x19202c4da312b37da407f122713f49d5939af238411da5fa9cc1bb27c109892d
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x201d5d613e2f902d256b524806e5e91cc34cdd0d8701750e8a97bcb4798ee74c,
      0x1c117f7d769340e723ceab238455a2eafe5b7ab058a689991adb9f3ba7d91e82
    );
    vk.QM = PairingsBn254.new_g1(
      0x134e6390546e4a53319850956fed63e0ce91204e040698d7440c82d9f4394d59,
      0x23d193dd761a4fb3deb9d7295f2fd9cdf03504bdd2e3e9b21e5303b2a52b9369
    );
    vk.QC = PairingsBn254.new_g1(
      0x30466744af3cbeb9bedabdb4d4632761dff17a7ce5e9c9b5cb3d42644b8c3781,
      0x224d34461fd4c4daabf8367a8cdbbd0699126f089b8fd7275e2bcfb4d41a2bfc
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x23e7cc3016cf9ba1ee095ace34f3d4e3a091c9ea0554101a6306f06b28a7e32d,
      0x10c2cb211a4808dd73a38de5cb9aa2503f6a1ad425b0af49e1a43ee138488109
    );
    vk.QECC = PairingsBn254.new_g1(
      0x3052028b968d3e0c5821cfe29f378c8b75093cd3d9a930f16365562fde574d83,
      0x1880f4ea14a89bc15c2cbdc7471e09595e2007724c71690190437d5b5cbc6f61
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0e9217eefebdc65198ae99b1cca55e5bc4327b4cd02c3bada812c6b0ac240c7d,
      0x29c51e26a730e3105dcf00bef2d4661a757609e2dab22ca0ba418df0bf87201f
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x285a3fc1e1fb1893d3d41c2164c5aeb9cb70fb6d279a97426db64379874faf02,
      0x11103d1bdceb535e12befd7819b41452e9d9963d3468438834822fef9043d842
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2c43daeec74271b9ee35567a77f49deccc294b915fbf481c20f1d19e72f16bcf,
      0x2ac3cc5160246ce4af5bc0a80d7bc11f87633057e7aac74e4094936b5d495404
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2514e9d500f062c04914ecaa1acf0e635685860804f3453de5c9c4e31b34b68c,
      0x0e5d6cfbb9eabacbccdc26d5664f942dce27829a4d666d014b913d8779fbfa61
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x227b460ea735b56cf59df890b276b6f1a0520c63bb13f8dd72c044aa0cbad299,
      0x1f3c4be1f25cfe093a242ff1ca654c3317743839e41d3a127f6f15eee9cc48c5
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x127f7222157eaf296179b17b38590f15065f177f1e0241759d4c97fc0eba0ba3,
      0x07bf38810035bf8746442b93d4bd86a91ec0833bc0be0fb5c3a91cfe52de2726
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

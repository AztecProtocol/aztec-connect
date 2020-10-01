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
      0x0d33af3301848844a0266aa1608736a0db0dcf16aa79180cc675e7ef723035d8,
      0x2299700042fe092571e0e0fe61fc36cced2ebce1e45d08255605c6bfb6682d20
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0b6ac9757990f0d8cd48bf397c155fbc2e97597c7bf4b45772cf6356fb4c5e0b,
      0x2461ed9fce1819d857a36c0a7eccb9040c25bea99e2597a630af9b4a1e4228b0
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2e4ff0523ab71ac47fa7d720b31b2e7a217ed5159c1fbaf3416103fd3fa544a5,
      0x03c04ced227db5e66e2e5b6da08e9b66f2dc71a60c9db897056c639da8bfc3d3
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x27039b77bbdf99381f116be3c323ad2c22a681d3fe32841db5a69f6617dfbaed,
      0x0863286e2412ceaa6ea6b6b843c1744f3bcfd3ca52383f7b3451d06534573a62
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0f07514e2740c571b4eb5943bdde9dad03a7d853b2ed5fc26f311c448531db81,
      0x2ba6e93dd0e6f3a13afbc9db1ad7eb274d9c2df544796bc63c49c8b052bdcf1a
    );
    vk.QM = PairingsBn254.new_g1(
      0x23d8a588dedae97c384d2f7b41d0883066228c3339c6692a944163a0aaef7a84,
      0x2b49b1e763e4c4b450648505ccf6892e48f3baefb1a340828b01f468f11ebdef
    );
    vk.QC = PairingsBn254.new_g1(
      0x229e7a304fb8d7c1d1a28e39cedbe87064cc51465011ce0e7dafa84aa3d95576,
      0x2e61bce0eb00304797dfb8d091348284a2ed00cd264498440bd48f53f3828861
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x21931530c91bdb0b2708adc452b06bff654f52920e4dbc363dd46ab95e7f1477,
      0x0efe7f409c195401cccbe0f48b3e46e7a505730d6cec9ec862326f4c5217aa1a
    );
    vk.QECC = PairingsBn254.new_g1(
      0x2d00d58fda026b0ae1920b74940605cd900cc7a85a11aa12b2745fa74f9f859d,
      0x130203fc3a437602e1150fef585eb04c6d30d2514a6cd133a06bb2fff2697a9c
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x222d6ea064eb0ee3159c75f95fda1c9e0d07e356309bdfddc44cfe8a4a10302f,
      0x2567afe8f09f6ecbc74a5bdf8886792cd46448018d86ce4a365710c590cd9aa4
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1ca52f15b841208cffd2d9284fb36f45896fcbaf76c0167fb93581ed30d211d6,
      0x0e76dfdcfa03b943a81955d19746eeb2889edf084f983316fb808fbf81b37459
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x21ff1a2ec7ea4657d4809e4902a724ecbf2115f9e82c5faacf7cdf5516224dd7,
      0x2379680e55303d3cfe59f3178c17643dca77c743ef5eb4713ac3ea01488afbac
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2c289878dc9bced50e135dd6462d864c027ab50685624120eb17f593bab2f653,
      0x0db7d191072b13f747845ee36292a0f435d4dc41885446565d6e7f70ba138f02
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0adc700dd68a71e30c8d3f00aa3821b92f22e1a6961cc29cc6ebb75007616131,
      0x304288119d826bf4fd98fe5cda1d28be3a31bbe14b32996fe9c1db9f3cbc2854
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0a59717f992982d0ec2ad4e092baeff33f236afb1073e503a0c96e536e711545,
      0x24e886ccfb8edf8c904db9f2c95e30971caf84ccb844cf80cf3ec36b5ee6c055
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

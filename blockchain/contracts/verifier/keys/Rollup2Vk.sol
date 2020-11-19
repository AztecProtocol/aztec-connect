// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup2Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 50;
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
      0x004076b328858fdddd5633c05c6c28cc1332220d2200c5cca8121e7c5c6e8545,
      0x03c105693c3336cb5a6305818bb4543746ba0ed4fc5e21acdeae5abb7e2b81e1
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1636218331b8d6b4ce21155d269e447f7a3c564ae1258708e2447860bfde0fe8,
      0x2456d6dc5fb892772b1f46297df9ddcad732a10d9299b9bb1ef24c2b131b5cd6
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x137eb76c187a2b617fac69f921ee64bb90b787a8471040f6848ac1a0a92f256d,
      0x2602ded3a0bf6bac0f95a1495be53326b967f5055ee286c9fc386f6be6f45e98
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x13afaa4ae1900f12f8190270b2ca1bf3ae6eafe0785cac429e2391ca3d6e5b43,
      0x103f8da543b6e8c51e9e55d74e988c079ee39214066f89daed44b9fd98bb433d
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x22bfbf69709594a2575b5dbc128a198e84f343672b280a89afd45320de79f75e,
      0x28db64adbfdb54245f6ea2feee935e54568feb325745a5a34ed509ae382f9727
    );
    vk.QM = PairingsBn254.new_g1(
      0x2f67c0046f98305cddfd7d0275a4ad59a8eebb1891e95a2c1f7eaff9ef23efb0,
      0x08f4850b4ed4ec84ced717ad5d2c874716536640667ee694ba43bcbf41f43b16
    );
    vk.QC = PairingsBn254.new_g1(
      0x267ac55a5652a06baabeaa14ae8daee0a4fb7f6a2cf59035aebd3c385b149b8b,
      0x008308f2b884214e0829eae727daedc55e3caaa900d2737a1eaef4216b0cb66c
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x154d8a1ea9d7f44ee863d76e596e3857aebbe8f741425d0d351a84f952b26b0f,
      0x12ebf622fc75d5c1dcdb50e30ffbc9882c087fb2861f438334280b526cfba5ee
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0c0f6a15920cd432bfc77a1e49081809143de973cda5f7439f15a5051642b9e9,
      0x031af3077b3e9b0d3dcd7c9b5f079abbb08548233aea047e615870e16fb6d1ac
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x03c2996ef37b825ac518a425d2fee1039a1f874a2d8c21304507c4d059a715ee,
      0x0d37a3f091eb84cf6003c0adc50f2c59f97d47877bbf9a4de2f7be650536b05a
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x088b254ae37ee4b00eee2deafb6a8290dac8745b66ccdd223ade357463eacd04,
      0x0e4e2fa1e3cc090ad4ac1b30c132ab85070cddbdd8785eff09eefa166fbb6f91
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2c67a6ce0b157146bdd4425b9de88aef3cf7866cdbf61a59e7f258583a3cda8d,
      0x2a615b103a27e1baaae09188748e56a832d297265ef2ba2b68f37b3ffbf135cb
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x093560b825e400e29b03588f1cc00684776d66caa41cd559e5cf1e090c630a8b,
      0x136b4030743ca6c0f56b4eeb6db76416914831cdf8797967facf59f00d34224b
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x266e6d2eb589c0d07ac3d1e8f66d9eb6adcec5fbfc78203d549721fac2899ef2,
      0x24e0d9393a3c8be7e00a0475bf3df8e3be8190b1e1925a440033e48927200793
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x18b2f7ea629451ef1d084feb617bf0eba3e55033070076efdb46e85875e61f14,
      0x0eb64344accca35f2b1d023db4835a22cfcaf413e1a8a8e7104c1bdb986eb71f
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
    vk.recursive_proof_indices[0] = 34;
    vk.recursive_proof_indices[1] = 35;
    vk.recursive_proof_indices[2] = 36;
    vk.recursive_proof_indices[3] = 37;
    vk.recursive_proof_indices[4] = 38;
    vk.recursive_proof_indices[5] = 39;
    vk.recursive_proof_indices[6] = 40;
    vk.recursive_proof_indices[7] = 41;
    vk.recursive_proof_indices[8] = 42;
    vk.recursive_proof_indices[9] = 43;
    vk.recursive_proof_indices[10] = 44;
    vk.recursive_proof_indices[11] = 45;
    vk.recursive_proof_indices[12] = 46;
    vk.recursive_proof_indices[13] = 47;
    vk.recursive_proof_indices[14] = 48;
    vk.recursive_proof_indices[15] = 49;
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

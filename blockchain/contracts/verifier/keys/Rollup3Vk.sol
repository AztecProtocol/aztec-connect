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
    vk.num_inputs = 62;
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
      0x2d4039d4fcc4a3205d732fdd59c880322b97f86b13a519347c7009b1baf09eb6,
      0x19330eea86b18aae3b2b2b6a1483fc61004dcb6c1560f0f48e3963eaa2103e93
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x15d5cc3b0a3cafd4ee4436050aadc26d25351a03c55549c92e6e3f35fd679f15,
      0x24d34f956fbbd1c1b501ddc56434089cf3f8e39fd6e6043e3a95edb283d1dded
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x05c8a2fedb377fde19a6f11165be715a758d12f6cbe177a43c9e38cb23592982,
      0x21b8714a5dbeaf109375e5f0680e8e328558bc98829f00d3aa9ad61ee754fcab
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0f2788aa58b5d5c51c5c2312427804305c91347335e7fd670edab6e0fd211ebc,
      0x230e181665c8140b79b053fe49c6718d881c14e5999947dfc92b22fbda79f450
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x29a27723ad244596c7eb765b3bf19b603c149a5636bf5edffd404afb0347ae3b,
      0x28eb7a1dd37b2557403b595df4624f82973bfdfe8b0fa28a4b14da350973c1d1
    );
    vk.QM = PairingsBn254.new_g1(
      0x2cdde167b2eff31a91f6fb913013315ac3308fdfce3922e07513f8356dee09f3,
      0x275d51319cdc75d697dda74372f6987fd979997f8fbe8516eb640f76d01f2682
    );
    vk.QC = PairingsBn254.new_g1(
      0x1266b0af7a9e4b38fc09d0fc1d4d31efe4ced7b5d1b5c5057ee4321ba1f72ba1,
      0x13d77bae73e467498bb889815f42f7fdcba91ccade63a6ba5a7ec302bccf73fe
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x05a16444f400fd549f3da7cd9667c675eb9db6082720ebe6eadbba7b8c24a336,
      0x2afd5a0d546edc8a31a0dcc48dbc570c13f29001c00cc305c3a9f0b1306d59fd
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1095324ff2efddd08eddca859cb7c3945917ca4f581177fa905367f92e806665,
      0x2fc263e4b0196096fe9a1594f13527f07dccbfbc60cdea4110a46382b5f1f730
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0368de8ad6fd592e4e6e2f276b10b41f7904bc37c779c965c95ee851d52d56d2,
      0x2eef95c21f50f25d8e0eded77c346ff9a100e61951d8018d8c2ab4c33581e868
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x29d01e5508cfd29955bf82efe4784613b705d2a761799c12ffc30ea4da82d3b2,
      0x082a1c5c91570d8fa8996a4d55571c2abf0b9c2434d4d26abb3eca21a7d9131b
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x047d43e0eaba9ca81c536187d1e7badda9a5a27d4abecd085456289ebe92f5b7,
      0x28098f6c1a71db1cd87ff2b94fe6306b7d94281ac5ce4fcfbfe06e9d06f27c57
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2ddddce7552283cf22dc30ab0a5882e25dd813c9a05ed2affb43ca12a991651e,
      0x0e253f7f136f37cc9df4f702b074fc9f79ea39d2a743739d0b1991dfb0408e27
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x07560f193df0fa742709ea066212cf9b904d481cce842a9adf0749a513bb928c,
      0x1de2f73f0428bf97471b2fc7aba784c01d1d29f89d022ded854ad5090cf56e3b
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2dba99ca7eeee8427d4b698311043ea41c6bb24ab009d4c893fe5d26c52932c3,
      0x24ebcb2c3764b36a46710937ec0e8e6940e8f1224c90033f8e40f091c41ecf18
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
    vk.recursive_proof_indices[0] = 46;
    vk.recursive_proof_indices[1] = 47;
    vk.recursive_proof_indices[2] = 48;
    vk.recursive_proof_indices[3] = 49;
    vk.recursive_proof_indices[4] = 50;
    vk.recursive_proof_indices[5] = 51;
    vk.recursive_proof_indices[6] = 52;
    vk.recursive_proof_indices[7] = 53;
    vk.recursive_proof_indices[8] = 54;
    vk.recursive_proof_indices[9] = 55;
    vk.recursive_proof_indices[10] = 56;
    vk.recursive_proof_indices[11] = 57;
    vk.recursive_proof_indices[12] = 58;
    vk.recursive_proof_indices[13] = 59;
    vk.recursive_proof_indices[14] = 60;
    vk.recursive_proof_indices[15] = 61;
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

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1x3Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 78;
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
      0x1a47b208402129a8a7209784c52ee22083b4093cb6eac5a1d4d15b30f997a8ce,
      0x0333ea4c6e6b922725afdcb4ef1091440f18853e503cd80b44fbb61dc38ed379
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1a02069e36e4fba283da6907d2a9fe472d0a5444ffd8a5eaca688b89fbf84b1e,
      0x0742a83825fa9d11c164221b4de0a0689bd3a8c701edb0c515b0fca525d0e839
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x003eb5ea0876d329e9be01de3f4cf9adde2e3380297404e3e303b15a8e6ec9ef,
      0x080f4d17e63fe1b0ef8cd675fc58b2e934c7d4cdee96915134ce8b6e9a36e3ef
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x108a5f730f779012819452b4834762cc6adcfc30ee353c4f3d93783683690509,
      0x1d8ae65de80372d6413b83400396a6b47a7d8cf5387c8e6e2952c02b754f5d53
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1c85f91babef3b0e7078d0f8dadf0e3a08c2c248fc2b3c28db233c285e7b785a,
      0x0485d6f1049e56f4b64eb443d4e13a6bed8cea9e5be6e583a790e555e01a5a30
    );
    vk.QM = PairingsBn254.new_g1(
      0x08e3f4b22491e2350d7183f1caa82cce1766ce11b11d807295fbb84a89e1445a,
      0x2249bb9ac06b3d82d5644f25fba72e8ad2fc7124ce8508d2a3287eba5a5cc6ff
    );
    vk.QC = PairingsBn254.new_g1(
      0x225c321434a558875bce673638c7b3d7991f16c5717d37944dc4a74af5adcc86,
      0x196fc5677432f0d0ba99449944e3f26da1fea7132aa7317b1fbd72c6bea0e5b8
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x167889d18a9ee1084aeebb5f1922dda0a5d56c855bb983cd3133d03e3bf1e951,
      0x0190a223a2d0a1010eb42a6547d3ff610898ecd84eb19ac475c7f977e102351a
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0a58f1f6cbf61537db0a6723b74abc83fa43921c01a01f366eb1821170030117,
      0x28593e2cf09bd7af234d1f30ce45f6120ef32dd491aba660bb53d72ffc725438
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x253975c933c111b45902ef6d0a3e8022c875da0e2bfc2885bfae37f9262e1b20,
      0x0f8aee455cd61178b63b7194e514cb8f2028dd6069c0eef67f32d98c75f7fa80
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2763a470d561255c31212f5a591ffb581c2af16bf8502cf9271c6cd2aedd7a41,
      0x12d255371442ed48275d9f4924e85a6aaca35bca383ceb537efc1c9cd38b9df5
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1f514cb1c403d39d4a484cfd50a93ef7a6c8cdbcbe9d81e71082f69fd73a38ad,
      0x2cb2d02ed584fff5ec1f78a16b9c32905cd1920ab350ddcd831d3c0530216f5b
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x05dd1a83a40b56576be05b5d756ffa5fdc9c88348685d00b4c99203766b36049,
      0x0f2c0af4c8fba4b24eac6d90ec98c83146e6b1e5e3772f604073c258cc18e4a9
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x06d0112e3ac5e42a3ca6165fbc5d219327c646cfb29ab2b5e0d1b0e87700f454,
      0x10c39f438dfe221fa4558c06a285494d0e9923894a75ae7afc2cb741284fa6e2
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x11a31f8c8c1abc1df98a32d8c8fef111ba2467bee24818440cc886bf071c8cba,
      0x06fd0efd021a1017071f1267dfef150683b21e035374a31b761c5c97b9666bc1
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
    vk.recursive_proof_indices[0] = 62;
    vk.recursive_proof_indices[1] = 63;
    vk.recursive_proof_indices[2] = 64;
    vk.recursive_proof_indices[3] = 65;
    vk.recursive_proof_indices[4] = 66;
    vk.recursive_proof_indices[5] = 67;
    vk.recursive_proof_indices[6] = 68;
    vk.recursive_proof_indices[7] = 69;
    vk.recursive_proof_indices[8] = 70;
    vk.recursive_proof_indices[9] = 71;
    vk.recursive_proof_indices[10] = 72;
    vk.recursive_proof_indices[11] = 73;
    vk.recursive_proof_indices[12] = 74;
    vk.recursive_proof_indices[13] = 75;
    vk.recursive_proof_indices[14] = 76;
    vk.recursive_proof_indices[15] = 77;
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

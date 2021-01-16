// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x1Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 1048576;
    vk.num_inputs = 12318;
    vk.work_root = PairingsBn254.new_fr(
      0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x269fbb1f20e9b1cf8758cd4f24ba2464da3c7a444109b1f940be88673928441e,
      0x0be6d67dd52319376423b5d60ee471f5a161c2e54c592367bdcc6bc9feb0fe18
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x110444775e0508d5253d8db02ee77e3fc8c7496abfa602e48f6eccfcb4b0ab3f,
      0x0287789e7074b8ff22fec678dc5bc90bcbdc4b321ef342fad5ab919a28da48a3
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x228642d5c64879536010665da39c0cb332d38f40dbe586b7945e242cd3065f8a,
      0x28bcdfefae69bad043b23826589bebf2fe7f146e3e6a1cc963182f6fd06e66b9
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x27d16a062962901e2865f4397cac69e6deb46db717632d87e682eb917e0bdce5,
      0x2d206e24cb526a3444388f7a09b81ea469a5662cc43e345c6c06b67b6c112347
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x11bbbb0bcdd2097a92bcd9f2d546f722ad2ad7327805514cadcdc70fd1c3c931,
      0x2fb49a6bb00db81d030bb89bc20b7b88adaf4b62965034255a488db553ada997
    );
    vk.QM = PairingsBn254.new_g1(
      0x1efe35dc4deaf74474417dfb0a6c2b970920e7ee7df243c83068d7986775da64,
      0x0ee1049048b247ac8a7389cb5e551775536d38d04274806524e49e70591959fd
    );
    vk.QC = PairingsBn254.new_g1(
      0x14729368171d3cfbf91a13ca3394da40ef55f01f400cf1b0aceb70c8a3afc63f,
      0x0844ed7826eda3035ed124fe7654ff80c32a0e138cee2f28331ef43b1cd653b2
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x1c07f6508953e5f0de5c3ce7e37b65c33a167404f749611461d57845b80aa8d4,
      0x09fdc0edb238940a52c0198d93c4e65e40495f5633c3e715d6c28751efa769a5
    );
    vk.QECC = PairingsBn254.new_g1(
      0x27a189894f708589de96923101d88f4bf0796d302e783cb5bdb375a5439c0a45,
      0x16dd09c50cecf892a0a0cee7f1ba88767419e4924af0ab7dcab0bb7881c173b5
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x24496686552c90f7574d619317d5f233accbf6eb11817c13584312351f29600c,
      0x18393e7996c14ad72f357cb873ba4dd0b2085eaa54c4858afcfab06447756f95
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x0e242c3efe5088762d87216de9f4263b1bfff5914812db0c0baed04ccc2994f4,
      0x06566ee6e0b686e8dcd5e32108e78e6e2185b64f596c0037cd521848ee197ff2
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1da801744a34a53de7ecc5d8efc6f25cbf53abee9bfe19aeb2e96b6200f2e876,
      0x1c41297bcb6c2e4e1dfff8ef864daf98b44a8d2a4bc11c3d411763a9bccf98da
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x02665199a7d2148a4e4a179bf3fbc6c42e9e5eaff9bb2a4bd2e846e66e35a1bb,
      0x19aa18930a43563e7b14ac4890992c327d696a2d47cd2e5ca0b05b1c86ccfe1b
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x10bfd9bb20fc83ea2d3e72ed422e64e9d55b7546f05cb00cd53c0993809a4bfa,
      0x12bf04a2c69275699d9025b471f61c2549eda0dd812f57514f80dd1641a4aa5a
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0901ac9aa11d920e5e0fbe9418352ec0a591c60a90beed480fb536a9ad06f889,
      0x17887ab01b01c84ef605fe5220c0f38d4b747448e8e0aca8ee336922390afe8c
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
    vk.recursive_proof_indices[0] = 12302;
    vk.recursive_proof_indices[1] = 12303;
    vk.recursive_proof_indices[2] = 12304;
    vk.recursive_proof_indices[3] = 12305;
    vk.recursive_proof_indices[4] = 12306;
    vk.recursive_proof_indices[5] = 12307;
    vk.recursive_proof_indices[6] = 12308;
    vk.recursive_proof_indices[7] = 12309;
    vk.recursive_proof_indices[8] = 12310;
    vk.recursive_proof_indices[9] = 12311;
    vk.recursive_proof_indices[10] = 12312;
    vk.recursive_proof_indices[11] = 12313;
    vk.recursive_proof_indices[12] = 12314;
    vk.recursive_proof_indices[13] = 12315;
    vk.recursive_proof_indices[14] = 12316;
    vk.recursive_proof_indices[15] = 12317;
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

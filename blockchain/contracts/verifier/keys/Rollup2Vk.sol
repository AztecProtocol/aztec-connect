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
      0x0839c96b5d7f256d0543bb8aff40f53e0aad0f0f77d6f71562c33b833ffc82ce,
      0x2d7502718bf12a126088ac5a70707e387d5cf466ef5161cee715dce1410b4f90
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x01a564f68886900aa5bdc939437c728b33b43bae4590de94231b76e317a28ac4,
      0x00923664c3759d6aef2204c7773ee7acc8899a42f7f2db245d5f15644cf98c8c
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x1f3285fdbf414b196ee0301a3e934cdbdb3385c82426f35dc4255ca25b4ce364,
      0x2e94b77f41a57f5586e4f5491e059184790e20d702c32ce67cfb46fa071e7d90
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0454ed9775e22c2ce83a4f6697c381a82bbd4f291aef52227084a09d61797c92,
      0x01140d6d2ca9067ed5e4987920283be82996d63a440596707fd02d26cf22058e
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x19ca7df32e89eb7f2724fc2e90f176df532bb1ecae07729d1303b9fdfee691e8,
      0x2073f609a87df96e7d0aae651e9b42cadf7e1b303b7258fcd7452e499ecc3384
    );
    vk.QM = PairingsBn254.new_g1(
      0x2094795326927bb5b643d9401f0d63100e13975e2c117b66c403018f60dd8d44,
      0x252cd66731e126eda202681aa96e5926c39aa81224dc2098cf143ab890fdfbba
    );
    vk.QC = PairingsBn254.new_g1(
      0x1a456e15094837fd1170b4013b011874225d1c410923589d549e76b7643dfce5,
      0x0a1414f13d77c25bcd2eaf2f598635edb22a02fac2820c968ca08315af7670b7
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x1bea1e4e93b63280a96fa275410826985c911162e55bc225e6d9f24ca653cf27,
      0x047fa7c52eb97442973a970be16de30a67cfc4f17fd5ab579fb8b28973434f8a
    );
    vk.QECC = PairingsBn254.new_g1(
      0x2ad056d162e8f6808c6b45e141c83ac28323400b558268137472f3b96a4d6d0a,
      0x16869ab20ff9de9ba407f1d2fe0bda435b7ce0bc448a8bb7e121d4a8613f0800
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x00295e39e4ffffba68cc6d93ca021259f526522a8d836e5294b02f685179ed7c,
      0x15600cb8bc64f1e5d0dfb0ed91b3194415c59bed52bfc4fba45abe6f7509d66f
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x254f8c750364e290cb47d1c75a4e0f2251993f0d8abfc51abaea71dd3ba0a916,
      0x30589c7c0d53b05d8af2b70cf133f79fdee81afbc24d63a0ee6aa6fd8b9ba995
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0952185cd149b055c4c48d9c11cfa5ae6bf249ac7fc65bbd74fdd0cc99aa75a7,
      0x1489fd83a0dbe5f9feffd364f43d5344db0c40f994c44903129f638e8dffb443
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x24f960db90c4008ccc5856304c4c5b7b55bdbe0d4ded1a77b08dd92f74e46f46,
      0x03d31eeae0c0040d7045811f97a1fb961e7b7500c5a258c0a51dc64cf81d0199
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x25c7b0f110a36ee03e5a0616f6b881b4fc330bc81b2164f1f279d9a27148cca9,
      0x1df700514d36d1d308cc61a16232e76cdde371552f96154c042b3a8eb805fa00
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x21fe0657422260226d6ae13da819a29e11c81017fd8b036f05bd5dc2031fa0fc,
      0x0416b35411eac22e2ca643fc05642a592171a8dd1e56659813fcac1a697bde03
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

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

    vk.circuit_size = 2097152;
    vk.num_inputs = 50;
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
      0x19193ccd0e748218d6781320564f6c540a2bb49d39e176796cb8ca6db2989d7b,
      0x02729cc559f49780ff1cfdfa9d37d365130906acb41817aa854b2ebe698e3e34
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0ba2a109013157c2255b144cf60ef5ec32c5afc02a9d1b2b2822ef73e8f6505f,
      0x277ab91d50b280ee5dc9e9ade6f3e148003c7f6124c5d36de868b7dbcdefde59
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x294adeeeaba03b8cdc1fbcffe3b5125aa5c2a98db89952b4201c16433e0e57f7,
      0x2a4f277363460d2f6633533a5cb3584559b41045ef72859c95f2fe8fe27af30e
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x07d3cadd62fd04d474440252562db07a3517f124d1f09183fe48d701b550fb60,
      0x1724576ed5f346d361c9616d44ec8108d3e6d07fec33a160eb93df3d061111b9
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1ced8d827b55548a3a62c5a62477b825c4b17933cadd16f93e89f4df0267de16,
      0x09d9b303aedcfceadfb47247b3c89a65cd259a233d0f7eba6aa31ba54fe90801
    );
    vk.QM = PairingsBn254.new_g1(
      0x104ca0496c7c0f18e323173a61c164f4bf3891df209137862a883f27a841f45b,
      0x07d877398265b8fa59388d36d50c97bd48745ed19b4c6ef74f1532287a7c8b39
    );
    vk.QC = PairingsBn254.new_g1(
      0x1ea1dc4139a41aeee8b390c37549bffb24efa6efd22d03f57cc4a538c9c26209,
      0x1a92c889fe83226767c3d52941c00a8d4d8d735c4a45962473fbc1c5d435fd5a
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0e245c28a31d05cb3b45f3b90bb0335411adc43f2abdb3d0c4b99e571c9c4648,
      0x10b13ae0700e542ec2d8269884e57bfb7fe1e5b6081d3daaefedc86954c2de07
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0dd23926a0cb283b9fd1b323423a241f29ce7651dffbf5e5e750a2d5b223d7ea,
      0x111d134b8d850c35b42e4246541933bb819ff5567df52c5f765b3a2dc3556633
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x11eea31fab826c83da5e7a277abe20279d59ae0605fbc20ea7aa60621c03c53c,
      0x28bfca22103672cec00f4c90b1f65a872e51d3647a604d7dccd27bbaf450a089
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1d848c26430d56fedac3d55a9fa69c7cd5b7cf31697a08841ff58107b43c6d42,
      0x0ca0a70d42becd83a1e6dc6cef6fee727b25ae5c3d89fcbf6b5ed9d321bb3094
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x045ad03de5f22940953a93f975acf200bb3ee27979e1dfd6029dc45d5f3b44f5,
      0x05ab4ab2e4196d577503c9e1398f58a6bb67d13dbaa23f91970d8638bc1fe99c
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x21cec399f3d0f0ac742fb09b385d30fcc2268d55f6dca169c3ae647967596d3a,
      0x1f4b4695450de0b76daba6ad3356304c954002968978e8b334a823cbe82651c0
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0de63cb00b8fd898549ff05682c62e00fda9ea7d5ceb63da591791143cce3600,
      0x1394c49e5eae5a79368874db265e71020e4e86a46e630baf0f582dd19b29b292
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x0bc1d51d55e26fbb44f00d047624ecde74889e4ef04a49470fbb95cb9f124f11,
      0x21f0033fd7d63fdf8de0b7a0b621bf83dcb8a5ed2a73a42f95d7db9d36133097
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

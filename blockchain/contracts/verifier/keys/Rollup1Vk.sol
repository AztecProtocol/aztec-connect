// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 1048576;
    vk.num_inputs = 38;
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
      0x2f9a3b864c730d44af558d7db02bcd7c728118cf27966571bfe40f5ba16a3e75,
      0x1b7a02a206d78be1829c414b6745c5a43a6cdf10cdfa5b37004b52e808a3b27d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0e2a200345b0fe6162c05d8600b6627c16b788fbcb59b14b81421434f73c9e18,
      0x15d26243e877acd28ea5f3e3e21760d58e58238fcb902958d5f1e8739f53f4fe
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x259a7732dd098176dd1367d1b196217c34c8cd525a3df537e3893a2f9fda402f,
      0x26f4c08a8ae8d0f26630b08419c4e290e69bbce36910e1ece5662665cdfbc55f
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0d17ab7261bc20858b90dce67bb20b87ec0ed1f2fb1ba8f8898c9aa98f163017,
      0x26824e09080a75cbcf5d749c9928fbcfcdf843e6dc2c947f74b75afe4f505688
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0d1b2d508c88374c8f183b03287f2b62ac9c5f8cb3ca661bc7486520e0e5b390,
      0x07c5cc27d07903d3a51f9caca0a1743c9cfafc662802380729c2ea5ceacad051
    );
    vk.QM = PairingsBn254.new_g1(
      0x2613af4c46bbfb3be4551bba01931da028e1410c7f89848c4358a16de7bcd2dd,
      0x0cc687e66e6ee95733e2393baad21e1715b46ced9eeaf21787bc395ec82e3243
    );
    vk.QC = PairingsBn254.new_g1(
      0x283a3938043314db6a30fddc16a23f4d155d749d49276fed07957d7070bd0ac8,
      0x18098d2f3546a662b082eeb11fbd0e8e707f2b1d84b26ba7194f5b6ff7b7c8fe
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x21de7e6f9276fc7985d41c29b7e7760dd461adeee02f99b518dd4a582ab7674c,
      0x02b2fbe6e924e6a58e88a4f0cd76bb53facdc5992e6847e6e0de0babb35d1c7e
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1d405c871ac0d71b6109d349a17af4420c2594a16bcc3cbda00cd25626f91a7d,
      0x0007fc418bec310ef84c171fd5965716218c316b4bc15cd073c5e5131c300737
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0eb90684b258626eeea0e9157c1d0e092079a9e2632804a758ab6e19d9fc423e,
      0x2186760041394db85f3793b7d1826bcfa55805172ab5a3af2e27e69c54be2273
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x212459dd1d269d190b2de9c902496ed3ec7db68b9802a47e9920719e687b70d0,
      0x0b9aacd07265c3c7146a420e02a886aacb6920e0f00bf41f00c558f4ac2eb0a4
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2131867bb7da4e39826ac05c78a50075d51f7ffd95f07c5a2d3f1c5cf6dbbf75,
      0x23e20a81ee911c764afefabf9be0efb60d9ffebc5adbd48ed34e4e29264ec1ee
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x18df139a4626c6a6f86af8fb75edf6ee7f3e25d4d2b8327e646e308604ca0159,
      0x1413b950792e03d34f0d9c8fdf40d4cda53b0ca481ba710c0f048ea9404047e8
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x00fd0659357253bd1f4d4203b1b27a175f8d1b2a1b9b7ff1ed00e4b15ca1af0d,
      0x0bc213c85a5b618ef7098bfad58e6f0e8561eb4a65f38f31184320826dc82912
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x1b0869cdea3c91c7e61b5d8c0ccd820c7629a59b1216edf6fb2c8b1712a719f8,
      0x183c707563991fde33337aba733814e13d1b7eebe36fad51b070a2fa4dfaeb0c
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
    vk.recursive_proof_indices[0] = 22;
    vk.recursive_proof_indices[1] = 23;
    vk.recursive_proof_indices[2] = 24;
    vk.recursive_proof_indices[3] = 25;
    vk.recursive_proof_indices[4] = 26;
    vk.recursive_proof_indices[5] = 27;
    vk.recursive_proof_indices[6] = 28;
    vk.recursive_proof_indices[7] = 29;
    vk.recursive_proof_indices[8] = 30;
    vk.recursive_proof_indices[9] = 31;
    vk.recursive_proof_indices[10] = 32;
    vk.recursive_proof_indices[11] = 33;
    vk.recursive_proof_indices[12] = 34;
    vk.recursive_proof_indices[13] = 35;
    vk.recursive_proof_indices[14] = 36;
    vk.recursive_proof_indices[15] = 37;
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

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
      0x0df3b709ad0cba837868b79c392b693045eeb0e2cdf4618ae1dca4941b9f127c,
      0x2015d19c594a1a573807db321d4e526268056d1ea4bdd7f8f43b96c27745f0ae
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2a70aa3814ad31b483d49c4f503885050ae22225852c8ec96fc6d3f5e3857de6,
      0x2af2802479dea076bde81fe307050891e4fd6b3885e20b59e06d9b9aca63dd02
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x094d8a18a866f0ca2e5ca7867a408cbac489dc54b0c8a5896d63c19d1a8f7672,
      0x128d046cd1ffa76ea9f6f0b4ca8b33dbc90edb5c55b9701028b2517fc97d1784
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x289e0e16da3bfee99b0754d019b041de2b3dffa1cadc6f5ceb1993a7827a6d0d,
      0x046f8c8ef786cabbe922231e4b7e2b35e3df820eaef731129a772a1462cdcf0d
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x14f74eb71ce330fcc06541829b9ee84bcda730fd6c55d0f831da09e08853375f,
      0x093d6c0a94b7a88f2511268178e2a811d8fae43e5aaf7a09afcf6c19914dc973
    );
    vk.QM = PairingsBn254.new_g1(
      0x0f568e8fdcaec871db59ea79b4d5819b09ae599c5bc87a135c06956e81fb0e06,
      0x2d4cc27625bfd4f02a408531605770cab8357e9caeb682e2654de0fa38e8df30
    );
    vk.QC = PairingsBn254.new_g1(
      0x0f8d55f75ce21da69c72e4f66e791e73cb161c3b39833da1662d9e051b72c790,
      0x13bad2df100fadc44692feac7eedb83529806dc61dd53628bb71d3175ba12ea2
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0445c2109badffc1882a17e1df0e36d12f8bf210fa19910984242d1c97ad969e,
      0x07d9ad91bd82ff447dc08e0d0191201573dc27caf7deb3b83b4dc3d88d440124
    );
    vk.QECC = PairingsBn254.new_g1(
      0x073dd7187a6d1b9cf20a905c1bf467d9fa229cd6d4e56e0612c954d182f09d01,
      0x152b5299fa18ddca554df48a541c13faf8d256bcbb3d0c3ca1f60c9f9d28d31e
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x150a4ece1f781d0bae08a0580acac8f7579ae3784f0101e0aa8b313cac1a154a,
      0x303e49de256c48b975dc12ef09a68533ce2da67f6c7427f6cc23b0df5c330b7f
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x019f8c7f7ac9dea5617b4a44b81859698fea3e5db97353f2167ff7bb264238cc,
      0x19a405e7096a9e8b89ae43e9cab908d88dacf7c2b42708748653e9af67308e18
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x27e67e54673e38e3a7da224bc29ce7de9ebac9f07c8a6423afaa1537d7f2546a,
      0x1c333e8f7fd4a9092301900bccd135afbb82b6b4237c0f576e55350e40884151
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x050e5b7cf9610acc2ea6d39dedd5c51747634a701edd2062db03d84b85442635,
      0x21a270c6cced6f0f9d7173a3fb20850e098de7cd7f9173466c54d0a0085f562e
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x06bec7225bc5719a5904fbab8629ed105163c642f87736804f63c09d44d31dcc,
      0x176c4a109be17de2248f8c28f01155a1b4f047087f6390691d5d012bd6f3b368
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x028631d2485f148841463d2513d452576a6236467ad1281bc205e7299ca577d1,
      0x04727a55307f8268749fc319ec13605a77642b954aed247ce19ae48e57535010
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

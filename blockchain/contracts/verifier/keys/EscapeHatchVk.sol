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
      0x11102d4e551ec7651122b2495876adbda9a3720f74aac70f769beb06e2c82558,
      0x03a35c5c214440a731f8d95aab1c335bd526c6c906154395b9ea953d1d282f13
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x09531357a6a462b7963bcea22907c5e132901b93d0c6baa94b4cba539cf081b0,
      0x03ffa36fd16e94882c7a90a396f197244ea4df2a07eec0696dfc60e95af437a2
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x071bb3da61e55864e331d94d90938e0c4d753fe079de0eee95a53dde72cc610d,
      0x0934c1ce71027c6490a9bcd72c925cbc9208f426d50212b4e7b9a57e67268fed
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2639c7e5126d3432f4abd7f284d49f02a2296acd6a046485dc33fda0bfc096d0,
      0x1ecb4307896a9e0bd54b772ea79b63cb420d1ddf71692ec635eddde4ef716508
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0c38b2e9ee996ca6996681f80649e608e3725d162cfe43d552f507b5cc432231,
      0x12de099f505a7950262430f3e4e248674d205ab214a2b6c6262c0af43024141c
    );
    vk.QM = PairingsBn254.new_g1(
      0x0e69752fa158573fd45b73e7b2c6c2850060a3f943ca83f350e5ab5545549cd9,
      0x287f2d0c936d95e8d2121aa21d52978fcfea5ecad08e351977941f0f7e52fa2c
    );
    vk.QC = PairingsBn254.new_g1(
      0x18829ff9929357cf0424e8d6444ba2509b1de491e928d12380bd89da81e88465,
      0x139a8f57e3da2251d4273f4ac56844e5fbcc63493c33b28bc09a978f6d15a39b
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x158fd2cf3834822c098f97690c1eb23cf46bf4346145789c48c7ced80328fe35,
      0x10524a157c9a78a88a2b236581e299e3b71a72a1847881834907981ed13cd535
    );
    vk.QECC = PairingsBn254.new_g1(
      0x2b18bce182f50cb91c841834ed0f08c22ba4d27453031929bcdd9b3a4612fd92,
      0x2bd5f453ff36011c7bf708a9ebfa87e5d5e435d485b056640ca20d14ac140711
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x14eaef73229f83049ca367f03401f49e7ee8203f05078ac3b1124e1689cd49bc,
      0x0bb0bcf5219e91bde271bcb9073ddc1f1388fa0f906b75052979b31dcc4d18f1
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2f39ff851c583e500cc9e06a5fbced46d6335747bbc10e6ddcfabebb4675dd09,
      0x0905d1de45c76eea226304fc0b2448e8608c411cbceacaa6900cf7e8059924f8
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0db202d8bbb637895cf0822d6bc43f2a053dedc060f99877427394ac08b9497e,
      0x1b0a652f54901e40c1dee65a90e12282a8fa05ea13b1d854b49de501ca345488
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x209dce1c062aa8712d7bb0357d04609e58c31b722d7c10c2587ddd4926273a9f,
      0x0753107a6fb321ed1b7312ceda9fc7f60e3287b3952c8b829b39eb0736355ffc
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2ae9220649380afa790f1e0334937ae5538736ad14210fa488813082f19a8ec2,
      0x086098f0c9f9ecdf8b1a8618d00f88e33d7868fb6f01bb2aa813ffbd4129cbb1
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x04a3b902d840b9a772390b026848b59c696689b157a0534e85e056622ce27cb0,
      0x2a77228a72145b24bb261c72713d52c471452f2edc2df53be339772fc2474271
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
    vk.contains_recursive_proof = false;
    vk.recursive_proof_indices[0] = 0;
    vk.recursive_proof_indices[1] = 0;
    vk.recursive_proof_indices[2] = 0;
    vk.recursive_proof_indices[3] = 0;
    vk.recursive_proof_indices[4] = 0;
    vk.recursive_proof_indices[5] = 0;
    vk.recursive_proof_indices[6] = 0;
    vk.recursive_proof_indices[7] = 0;
    vk.recursive_proof_indices[8] = 0;
    vk.recursive_proof_indices[9] = 0;
    vk.recursive_proof_indices[10] = 0;
    vk.recursive_proof_indices[11] = 0;
    vk.recursive_proof_indices[12] = 0;
    vk.recursive_proof_indices[13] = 0;
    vk.recursive_proof_indices[14] = 0;
    vk.recursive_proof_indices[15] = 0;
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

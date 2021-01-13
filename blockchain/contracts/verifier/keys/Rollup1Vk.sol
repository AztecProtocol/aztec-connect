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
    vk.num_inputs = 39;
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
      0x29fb4cd639f2e5b5c2a70d1595a0ff24f3cb45031ae88e219faedc128ca86264,
      0x148978ef1babf54391efcc54e221658e728962df5c8aba14b57a36e4940e5fec
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2865a2b294b8cdeb5d8d6e5c5eb46e16286e8c1d281683b03af1ff42f8fca269,
      0x0b40c9f54751f77e042ef26e8b67ddcb4d7ed00440de5b909ac1b40c01579acd
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2bc173f49b589eca6d4557f677d4fc5ec9b99d20c16d450fa542bc53859f6764,
      0x0f5476b83feda5b5fe0495a2fbcb1bdbb70bce758af5529c2f90c070daa2b731
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x21bfb1a63b7b85f77311ca77e5528adb1584e95990ba543eeb94e01690b091e4,
      0x2bac9eee34a9ac43cdc3e9f6b7efad51fd643bd3b5ccf5a834e954855ae1ef0c
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1fc58a943318e802cb2fddbda348611c3ea81c734b34f2c00e2afcda5d8a9912,
      0x13b04657e973f96a5148a580e14951b8a53eb633b177101b2eeee8b2ab683b0b
    );
    vk.QM = PairingsBn254.new_g1(
      0x18017cacc88fc6f02fe09eb0ace30a3770a074d207512b66be8494b1d3cf7fd8,
      0x0e05b5ff264c2c430ab467e17e80863f30b7782fbd1ba83b8d31f7ff5238c1e1
    );
    vk.QC = PairingsBn254.new_g1(
      0x0c0726dd10965d7e60b8640ac0f7df83e2b6f96b31e83e0c894f8bbbafc805c0,
      0x0f795149e8e9d041c835d01eb04befad6d0d7f7c01d70491dec12faebaa74271
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2842eba0a5dfe87f61384d7c20280896fef0b4f9cc416b5bf237c3627f49b67a,
      0x235adcf880f176d3e91ab0b7971e9e121989a35f8f712c10b3863ac118fd299c
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1cef721751b98bd01742e1f4350a74fb4163392c9809d5d4024aa74b9b9fade4,
      0x044b1b4bbae7d4cce3fccb992ddcc830c4f7b862053c3562f0c7b991cc6b3b00
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0ce630f8f5589c6cb0a6eb0648124ad4fa892373f83c8c773f5a23ba2b623c83,
      0x1c514f7db59c53261fbbd4a37b22a994fbb206efea44c0336fb876d02b8af012
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2936b0aade0ee349951a1ef37abdad0b35a9ad9f80fcb98f12705904fe2c8681,
      0x19d4147a27e894870019111b06851aeedd624635ad83c684212598fc249d9885
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x00c8008a644bc19a3dba7652b0b3d1c8a7f83a69bc587a4070477c2ce92fd796,
      0x0c1e1d106a8a669520726c7c5370d32b872561465f032b403f0c5a50d04ab2f7
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1773246b0655761960d65451506c47cc2cbf95342e6e28242ae5220a5a79d279,
      0x1b84d2415953948eaf324c1b1bdd36833e98afeea75d24f6ca9342d61045a5ed
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x21d0bd0fe9aa2a3f50cd06acf6e91272a80643abbdcff65e31296e7602c8cf70,
      0x1ba5dbddb28c5442f845186d489d334656feca420fd46167f419b73c1d041802
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x00256c4f4f6f96966d4ca797a8eadabad1d12e96eb773134c8accd776bcf87b0,
      0x031afea5e4540b36fa8407704b6a807db55e72dc9764e4a5d721b192265f6630
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
    vk.recursive_proof_indices[0] = 23;
    vk.recursive_proof_indices[1] = 24;
    vk.recursive_proof_indices[2] = 25;
    vk.recursive_proof_indices[3] = 26;
    vk.recursive_proof_indices[4] = 27;
    vk.recursive_proof_indices[5] = 28;
    vk.recursive_proof_indices[6] = 29;
    vk.recursive_proof_indices[7] = 30;
    vk.recursive_proof_indices[8] = 31;
    vk.recursive_proof_indices[9] = 32;
    vk.recursive_proof_indices[10] = 33;
    vk.recursive_proof_indices[11] = 34;
    vk.recursive_proof_indices[12] = 35;
    vk.recursive_proof_indices[13] = 36;
    vk.recursive_proof_indices[14] = 37;
    vk.recursive_proof_indices[15] = 38;
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

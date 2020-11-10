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
      0x0c72fb9daf754ff763db4232c0ed18a81f74570b59bd4c575de751335a92c4eb,
      0x0d4c99cde1cd16606cbd827f973ea20599a8c5ee6d9d11c4e1454ce806689722
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x110e03d41a7980286e40ccd510d3a34885e5878faec22a819764ef612f780448,
      0x184248f0ab7facd519cf05212a16e23952250efa4c461da42619be8ab3865e30
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x17461d0feecdd5c3e2d2d25d884335af915de7b53cede621a9f44d5f6fbadcda,
      0x1bef7af097bc256fa2a55ebac8aa3c1363df2e907082d118fdd7d7393d9c2078
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x25d0d53d3be3614dfbc5eb040045f55b2f41f1768560d6b0cdb3fb5587f81493,
      0x04850c93d68dd163a80cd0ac29e84e9e1e791afef3424012a3b79e19307d2449
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x24229e2a0f6b12860fb26031ac4e485c14d06ede712470ba929e9a548a4a5d26,
      0x0619f85236c6647a45dea7ddbf14adf12da6ea6564356ff6426102b8a7fab9c7
    );
    vk.QM = PairingsBn254.new_g1(
      0x0cc980697cc471a7908b3d6c82a48bb3cb611ccbf0aa1f8c0acfaac97a7937a7,
      0x2f87b53088c8fe57cb5492a34d72f7cf617c280bae8e738c5a51db23cff945df
    );
    vk.QC = PairingsBn254.new_g1(
      0x101b9d770ff2765c7a664867000ff23c51e8946416bfa19b2d988ade2d0b1109,
      0x1f0f7a2b7f5b4204b627da351737facb444c3c7a95974c5f0695c9fbfb3688e5
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x260c6e328099f34a7070dc5dccb28b963eaec880632066c193c5be2ccf42d228,
      0x28f1562435d0f7151e3879fd8d9624d429ba81f521a4a4c0f15041523e5c001b
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0a45f4f127eee56dfcbd0fe7c353c1a27e4d9eaeaab818078137f8cbf974480d,
      0x20d603d4a9eba35bcdfe2518c523d0d2c7b7c4fd17208a0995df8b4cd8b0022e
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0c1581f2ea376a1d4baf8a4f14cea4e660b7ceba59c72dec16cd6a4b22f3997c,
      0x27c68d04020b2dfd0ab0f2a46d7a0470031ca2cac744e18328ef523da7cd6063
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x00375525a07e940e01c03d153da2c74fb4f8e50f59dfa15baec1ee4b7143d795,
      0x08409883403543a6854839dffb222af0285cb93c8735883432cf86a863472e3b
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x09f810a1f9a3f8eb9930118f314cae1b2ed39a94804a72b88c54a623c2531759,
      0x1ca33a78a56c4f77529f48cfc9583b9f4aff1494a3c83b965d21d523a83d12f8
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1f4249772e2140e0da437be64048660c40ad2cba2164cfc8a3ce30722f13c91e,
      0x1514e129a090134c2b03baabca4feb887ac3ef99f2b38ed40277e238e8c6e2b4
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0274715257f1b63ec9e88f1b6b51d2e3b077979fd4fdd3853f7644f1c00c5391,
      0x0480abb8a987589f35e514c78f06361b43a5343eccebd1db8e0403bbbd79218c
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x094d0af2f7e272a67b4a4dcdbf9fbc6bf40946040217a82d4fbf8fcc88b1ff7c,
      0x16ac12e52c93d253cd5340bda0ca19a7bbf12a4d2fe968b1e3c6353830d73d39
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

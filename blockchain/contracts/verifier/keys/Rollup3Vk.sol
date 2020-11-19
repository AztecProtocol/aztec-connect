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
      0x1f6e26dd23e38fec11e7b8f9c1569eba6ffe5776c40fa3d7d8ef8b46ab806806,
      0x11178fd8e83b3604403b0d969f2cb63c6375089ea5be6dd1767c929954f8ba29
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0b63bf9eae06dcdac3c59410666103d95ad9e254ff31ae52ba73489105a9dc80,
      0x1761e296c2d7d235b8a85d6a59ad10a7daa9f46d0b2f732165715cf8e20938d9
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0079d256e063fb9e1ed6576639d0729e8f3a425fefb936c7c4daafdd61e505a8,
      0x0fdebfc86bb8a5f776e647916a59ab8894b8da9dea05f190b36d78340953ae06
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x03430db6c26ed65bb6a27e997fe0930f07dac88aa58350cab2a9fca30b597414,
      0x0bde37055c1283aa7b230024f93191e76e6d5cbb905ad092e9c54059df19042b
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x0e7558c8494c3829510d6a1879ea57ae6e9fa4e281c8d1bcf3ba0889ab841c62,
      0x218960fe8afa21a8f83b9b4e2531ae7a4950432038c08143cce4902afa03f011
    );
    vk.QM = PairingsBn254.new_g1(
      0x2ebe25853f5243cc29246d035911e70644cd586616d1274adc3c3efa2be8cb17,
      0x14c7fc1c761650e2abe265d126df4d72f2d918f948532b9022c8e27ab4ae7aa5
    );
    vk.QC = PairingsBn254.new_g1(
      0x2fe2f5a84117db8b48839a2bf34fe0ee0a471ebc970e49c315708fb673b01892,
      0x113bb5bcff680215d76d0d20d045a17c6cda0e8b3ab5561e9c7343980c1520ae
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0f6c30f1cb99b12234e6ddb70c35c70639d93d21532d38183b6d949b95596eb6,
      0x2400ec1214399370c08d69683bb988bb7ead0b25f81c0c3c8a349b42e8d44a01
    );
    vk.QECC = PairingsBn254.new_g1(
      0x28dc157be38c0203ace99b9a9c3ac973ccd5dea8791ff3923359995c671115c4,
      0x0f43fba253a2fb6574f17b50bd29dd29f69462c8b0d335990fd66e1418d08ad9
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x23026355877e6b2a9c1a62a7efc11bd0ff4e50b31aa9bcda80caa21793e1e7b9,
      0x1d0889082fc10863516b58079bcb824fb18a97c67ceae3a56ebd6a4c6fff362a
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x29dc4dd18df376cfeb3183546c061d12686482c1524575ca6469037e0151667e,
      0x22c507a1051818410671ff0e6ab3789d525b0d21a4318321768354242fef20d1
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1c6066f18a27bafb59692db58544572567bc5e10b166b0cc4fa71cf8e29c70e3,
      0x24ae222580ad70596da11894cfcd40c46fcbc99f6bee9c7f8e9f1ee6a022ab0f
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x17d1ea15fbefd28f9f7b750e069b388f6f4df12e1abe5d035bc4ecfaae40a330,
      0x061f20cc0f5733d178a009885f8571dde7955cd4dd51eeccd173ec27a318ba26
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x12e0301c65a07bce795377b1c2f0816e85bca769f07dc82d1ea6a62b3a3fa46f,
      0x111a3452003a373d2f097c63b9fe6fa63292ea28a456e903f6d603b431503f35
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x092a6497969f72cfbabd26bdb5ec8ad8e7a3cc6566f2353ccb8576f4ff239bd0,
      0x3056658211d41e0b01773f3fb24e3dc520cad0f270e27d86f6430a5147c204e9
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

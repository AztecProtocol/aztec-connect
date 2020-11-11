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
      0x214d505b96576c14626b4106d3f7256831d32a7c0b99998bbb792062536303b2,
      0x174734181bff75f98c93040caa2ee49f11ffc95c57f625982e7539e66f7865f0
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x04fa03f1075e50bdc37ad082129dda2603cc86165d3ad024fb2f8830ab2dba72,
      0x0e9453e532e802e2685eaae226447b261f04f49934ec43d0f803d7fc74c207a1
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0d72c6099c7feee7b495eba3bcb99eb6cc8495d2a8e5647a76edb0acb253021e,
      0x13dc112b78a02ecfcf67886fbabe6dbebd6dd9dba61880f72ea677a2d608b18c
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0f9e64f0e74609f06340810abe6f95589b30c62e43835356ea237de01df2405e,
      0x0be295d03ced5ae039001e593d662b98a503272cd3f32be1616f4860215338ae
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2d7d3047d5f7c7b530f0976a812b700ad84746b2a3a9c186f639939d31389f68,
      0x2aa4cb72c8ba8279f4fb4f2c00a06ec7a6e551efe0cf4062bba5876997d9883e
    );
    vk.QM = PairingsBn254.new_g1(
      0x03f7f3eaa85c6b284757919de5682780459f2aab001adde8e1cc5e4069261070,
      0x2a06700c05dbe97d02f40191d69956603e0ec1e70d70183a010f8a5613cde8c3
    );
    vk.QC = PairingsBn254.new_g1(
      0x19b378322169f9e3dfc325dcf556345e81fddf049866c10001ec5a8b4f9ddea4,
      0x0ef4211c63d9de5781cca9309b0d32e6d10adb3d071b6642346e16f00c451d66
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2f438257f39d98b2dc9d0de9109426b890b62b2a777100f9fc5c41601445e922,
      0x24bbe1bdcdc11549f06181f592011dff232561d430e025eae1ea739bd086f4ec
    );
    vk.QECC = PairingsBn254.new_g1(
      0x105dd16d8ae5cc09598a12c2cce42a82f296c386db2dc0acac6ddfb935fa845f,
      0x28b8e6ebced66134c0611ac10ac2a5ea2d30583f2bfad0f15643fc1e5420cd6e
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1f2deee2f4dc950afdf9045c08f71218f36d1b97e82797be7bcfe960ddd7f5b4,
      0x06a1d4ee375ba8adad961940f5ec5db1cbe58a36b0cf7e2f2f3e713c42f85f35
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x03f19b86e69af1f0cf675f6117e9093488e7f44116290d9c5677b3615c1a7418,
      0x16d20bf2524b14dd7e85d7f70a750f3e9f8bebf9c04a9862d54725afcc7453a7
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x16ad901ae06b583c74c54ee47431de0635d20a73e1c4b93c277eabca2766ff80,
      0x1c955d4f2eda1e25dcfcb09bb6a266b21ad119285746121443a35cf313182ddb
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2c180b9e7bef76f65b71d747b062a03572266b07392987c5676bec8ff12d40b6,
      0x090cbd7afd33cb0221a77540d428dead0f536d8c73a1c55b73361cb268b315c9
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x01e135190edaccbf70a9133a23970c776fa102e8ae09e1f7392a89c965cc37ba,
      0x1efbcf6a3902f19b3458931d0743c9aefd6f52ee82680fce4c71b5188267c86e
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2b81349362859616bb625b53cafa40204fda78d5e349dcd6d42f7988e70dd3bc,
      0x2c5e61d3a4bca975da1849cd66fdd62ff8b77943331dec19ff82e431e8aaa2ec
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

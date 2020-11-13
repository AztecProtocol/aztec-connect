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
      0x058984efaa93374dcf15af2559b86e6b7126786388dfecb073930f2640e2659f,
      0x18682ea195b0b74f97a1d1681892dce311fb2aaaa1c6912e9f01717301ef812d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x11132a1b32518a47b9d35c85071cbf0a4afb37fbc2ebe8c7c4789cecfc9660a1,
      0x0a244c812d77f0e1b799e17b864d2aa68c7fbcb8e9815a6a5c06a10d0d168bdd
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
      0x07a0dc9a30928ee045269079be81595adc474bd6a7a06da5195d58f07a998aaf,
      0x0d5ef26200d6afe2940a9b78b6a64c6540f079f86ebfc466ea656d23d46bf094
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
      0x2cd5bb6e20890d52146019139f29f3cd987d4b47738c0821113c357fea4526bd,
      0x17ad33664201f19b28866f599ddddf0dc1e6616d411bca2a335ee38e09940c73
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x234e97a0e1a63ce4444c5a551a028fecc17fd945704f01a60b04fc6cdebe5a6e,
      0x162eaf37548954b845f8521ae9124755e08ad0a7c0919217fbbd63f28a3851e8
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x20794cb55784e23d90c423aea63d80be0746b8ecbe81c19a88de9d49a9de967c,
      0x02ebcba1186760d5273409c25c13e7dec5faa27fc41887fc58d5b5df33242455
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

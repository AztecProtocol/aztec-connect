// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x6Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 8388608;
    vk.num_inputs = 98334;
    vk.work_root = PairingsBn254.new_fr(
      0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x0f19998d98e1cfc9c53d896f4074f6d2b051a813d678e97fd63519f156125006,
      0x2e8b7daf205f4eae5e24dd50c2c584d5a6aa63a70f18c4b6ebaeebce77fda232
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x09cd19f80de0c0b9d9bfce4c9483fd2fc63aa55aeb92021763ea232b02cae6a0,
      0x15b7a754d46d80db22a5f2bf826f7870548879f247915c3f024eaec8e98899c4
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0f45100604ac5fe4633c8f13f6e4b2512021e4e8f57e8b2866658a5279c59e57,
      0x178a40583b64b5834d82493faeb4ff040f7bbe32d5d585c48567738866aa4ce4
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0175f059f2a6371ad95bccd03b4a7dcf9de9ae1cb0e7f27f0a11217ac4282253,
      0x2b7e1fb613b89796306051b701b0f6fe636bd5c0c99202c8eb1e4da54f75b796
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2ca32c596f739937a1fafa832f3b495c688ba94816e7906be0e594d86c47ce44,
      0x24d7966e0ae2c970f9d5b7e1873b08f6782a264beb1221a11ca78f2a0dcbbff8
    );
    vk.QM = PairingsBn254.new_g1(
      0x265ecea20f9745d0f181251aec0a255aaefbc2e40daca71dfef16611a66db91e,
      0x28609efee7ded57c30340d04c4792e0844db7829b938c1d09c45b145b677ce07
    );
    vk.QC = PairingsBn254.new_g1(
      0x0f0aa259b8fa4f083105d05207df4561b7a01dc7f322969b2db350928f3fe280,
      0x04d9616ec55fb861e6040416b0eb8c43e55f603919ec9179310a6b8a77210a67
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x08390c8ebf09e568616757799404accf4410cc346ca180df01a1c8729c2db259,
      0x2561cf80c16b12b278a79712a3e09beb853528ea653a1fe1ba49a3c64674d419
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1cac1deda51fdb4c796f3cb00fa1731d8194c21682b8ab40f1c1cbc8407449c2,
      0x1590836f46fbae0f54fc91d77f13d1200f22c77fd279692fbd06f2a2d93a919e
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0a51a2acdda293a6d16a4fde499805c71aa8d2c552ba6aef5d33abe2fec8d6af,
      0x0023246883ba278d9803d1e3147765b3631bafa47bf12acb166218db72feca75
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1830a9971fb8383cbdb2b8dc62875072f30e65580b3c580f1cf636ddface687f,
      0x2fe61a46d39afb5c74ccb278de6121d1b9907c62492e23fae7f3d5a49c71db67
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x221298f611ff2dde530f583c4537828048d1d8101eb58d9ae57d01531e189f20,
      0x1a40b3ffa966702f36690ba8e87d359da6841eaa4c0bd966fc94990fcad161cc
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x02c7af3276a623e3f213d53a441d393c16a28c977931c388fff0300c5272e51a,
      0x1bb91dcb25e38d99abbd7ea376cdd6091fbece938d0fc1ea121d473dde27ed90
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1eb51959391b0961e21238439022e61adcbdd860c658b96b96f0331b44f439fb,
      0x1ce03ae60c88afa93aa937fcb99f8804efc5a57157b3933684616ba785540707
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x09c9940b82afa07d07e340f41731ac4cc767f5c40a667b8ad5a498680864a15b,
      0x13b4fef7b04b06fbdbaf4a0c61f9349b3cbea0e4013cb3940616ddbc837716c3
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
    vk.recursive_proof_indices[0] = 98318;
    vk.recursive_proof_indices[1] = 98319;
    vk.recursive_proof_indices[2] = 98320;
    vk.recursive_proof_indices[3] = 98321;
    vk.recursive_proof_indices[4] = 98322;
    vk.recursive_proof_indices[5] = 98323;
    vk.recursive_proof_indices[6] = 98324;
    vk.recursive_proof_indices[7] = 98325;
    vk.recursive_proof_indices[8] = 98326;
    vk.recursive_proof_indices[9] = 98327;
    vk.recursive_proof_indices[10] = 98328;
    vk.recursive_proof_indices[11] = 98329;
    vk.recursive_proof_indices[12] = 98330;
    vk.recursive_proof_indices[13] = 98331;
    vk.recursive_proof_indices[14] = 98332;
    vk.recursive_proof_indices[15] = 98333;
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

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
      0x2b25e108ebf17e6ea9706a782c633715ccc0164c10955671d1d8eda0bc018af3,
      0x0a965e1fe64ec4791e224261cc36b30523515589fc06ed65c0563505d8133521
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0f08581e5d4165d0a083022de78290c3986dbc957c302f9473ce939d30a658a4,
      0x28aaee215ea4065a2bccafc669712bea3fc063269cdbcf289a284cc247676a53
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x15e67ec93b8ee81df38360a820855cff7768b3d33903862aecd2e576672e405a,
      0x001cd2337392cec5d6dfab72a2163bd34c0f076deeffca5e75ba257e5cb16cce
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2e2a8e76d2d98202c9218a163f86fa3bf9c578c63d07eeb9c1edf6a8ba3d2b43,
      0x04ba17c7cbbd0f754bc7a80145e8ba347d1002605abe4fba8dfe4121192e55d6
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x17820410d9e111ef6e88560ccfe4a480ceac635dead34e60f63dc77563b67ae5,
      0x1893c95c160873a260915b1999192e65fd0d3b0c2e7e8842b2c125a9264867a9
    );
    vk.QM = PairingsBn254.new_g1(
      0x28856ed06e36cf7a6fb17a6d65b7a4fce8017d49d50aa88a52281d7f58fb4ca7,
      0x2ff6293d23e3e02ad2906ee91099e9fc8d1ebd3942aa7e51dccbd59e9082f20b
    );
    vk.QC = PairingsBn254.new_g1(
      0x28c7dc39cde225d5a29aa9c202c87a5006df31c7b9b9776268ae9884315c97f9,
      0x179ac6129c98d797d6f74eb6b95b65e176f8b0c79d5637e2c2248b59b786a86d
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x09c06f6c531b4fc4e5fb037ace17bae2b3da735cd60031a46ebd310d628e2d1b,
      0x2ea56a4190ec3502f7e262ceab173ab13e0c7eb3b95e36ce73115b4305d20bef
    );
    vk.QECC = PairingsBn254.new_g1(
      0x2258c88288ef5e7a35ef60a948adfdd0acf3cd3e6fb20e968079554b2b3c0cd1,
      0x26df73179e10d8c3e18df8ee8e93db75e025565ac378b795667b5499d77bfa95
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x20f43393e9af81270bf5698a8bf639707397a46c82bed0c90fb7f231e405bdf8,
      0x2a9016dfdf1d2ec197ddf89a3344f8d6513e29c57ca75a114474dd0a43151976
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x0a12e326ed80a41c96cf4b1bd7aab8a98148747908f6165f4c843275e1fde94f,
      0x21e9f5c7321752521cad9d175468c5399510f6e82859cde3698026a56b46c958
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2804bafcb20cfb1971d669e55e8fb0b6e800a310f8309e0a4993de3cec7b3577,
      0x1ff8482b0c1cdebd4f6947aba11ec291233e5d3a92189e1de714832fd7c94bda
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2980853102489ce8313539a16754870631a991c5f2b53eb225c0e5c35894a9c2,
      0x16b144b87e34a549b9d658129ff187915481f4c03b5644be6f15a7ca1969432f
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x14b0e8f4fbeddcb0e9661e4ef41e91241ce7c13218b1321a9d52ff0eff709e04,
      0x2f337f29dc1acd1a82d008fa958a9ba33fa8b62e10563934647bc896f9951536
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2185379048d77a4e68b1dc83b7b9798a2d54f22ee02f524efb820dae1f4a183d,
      0x13cf600cfd258b92794df0fe07ba640f3288ff6552fd2ca3632b3699e639782b
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

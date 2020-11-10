// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup2Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 50;
    vk.work_root = PairingsBn254.new_fr(
      0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x15955f4edcec406cf05d35834f3ee4889111daea1a66acd47579862a4f5211d7,
      0x1c7c8f60fe99f93020e6425546b22c385a8f363779543bc82b4ba89a5355f14f
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1f0f9a0173ef23f77d626cef559d3fac7865725a1b82299069eb106ff164d68f,
      0x00458f5c2c79903a6adcfdc3ff382c39190636a6c97c76cc1ac71012437d485d
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2b28e498dba62ce060935214f341e52be5f9119a13a6772d5861b8599d9e1c88,
      0x20ef8f455bad5cf3e94e5e0fef5927bb8d9eaf724712b9a62f5a185ea6cea686
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x09a599f91e393824cb01db817cc1070b8fd6386678087268d1b9152e8358c38c,
      0x291b71bf011cf3c84a816d87ced7688ff30c00962bdeb1c5a6cc91a5909a15bf
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x23380cf435d09b4c226df918a09d596535d92f06769b89d3e27d20479034a833,
      0x277b5b285cb5e8bbac0a4712d8d600770a94e9457d004748fe289ffcaae1151c
    );
    vk.QM = PairingsBn254.new_g1(
      0x0dbcdbce1f5d2e7830745fc012ce024805d6d4aa5cca023e27ff0cc28038a924,
      0x17a1e375923b758f541af5c179956c0ae067ae5d3f374bdcec8d5b1c57de28a0
    );
    vk.QC = PairingsBn254.new_g1(
      0x05db41a35b650c7b2760c748ea83f7565d01847c83ac9b9890525a1126d48b29,
      0x175d6afc95a3903c1fc2039b2748254e8617b476e96d04b58c7a240d7374afd5
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0bdd4dd82f6d9e59847938fffbf8bbf35693abb96f92ea8a34cb194a8d06aeb9,
      0x2341fed24d3479bb16d0af8ad26e83fda74fa497e2224d6d5303825d11e3f073
    );
    vk.QECC = PairingsBn254.new_g1(
      0x077f2b776240fa3d0735f9ae56854fd2231b7bc42f99ce70adad6d1916652de5,
      0x0d0a0e8115306dff3d442076c45df71c3e79bdd712dfa452bda3ff3b16194419
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x134cf0f95472fdeddf3a800de6f4d7250f21264a7678d8bab2514f7f6e8a6197,
      0x02d7fa1db91e18f97e6c32f958374374691220566c0b70f01db0e4621ad9b41f
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x00304b0d8092aa1a744313a70b8a8cc84d07727c4700ffbfe12711195406535f,
      0x149c9c8f5a5980d4a038c66c93159b4748683920dbc2aa3690d99527dcd5cf3f
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x14bb6ebc40d0e3690d48a2ed848121abac088f92fe51de89f1b88a3bb8df7993,
      0x1fbc71f35c62b03bf7a94e7a17e30c05cdde2d1c9bf5ef731e8c803592b01b47
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x12c6bcaf2f9ece183480a7be1e32e8ef295b2a9ef095b9ff9540b1601466a757,
      0x043471d96fbce33ec0f757ef132a99b3644331f15d64fdb4f3b9a44182c1c381
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2722bf7cb37cc177bce99fe4fc9fa8fb81724e2d57d6f2e5242e06e15a64b713,
      0x283b3ea094ebfc065853af3ec7ff6a9943d7f25a827574242cd95b92f7a77f48
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x1e04dca22ca2ce007ebfd4758e5a9ee28e644c452558b8e47b3d3b84f2d1baf4,
      0x13f88ca20bd696d68f253b5c8b15a6e7c48aec586b6f591d2ad49fd804842698
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
    vk.recursive_proof_indices[0] = 34;
    vk.recursive_proof_indices[1] = 35;
    vk.recursive_proof_indices[2] = 36;
    vk.recursive_proof_indices[3] = 37;
    vk.recursive_proof_indices[4] = 38;
    vk.recursive_proof_indices[5] = 39;
    vk.recursive_proof_indices[6] = 40;
    vk.recursive_proof_indices[7] = 41;
    vk.recursive_proof_indices[8] = 42;
    vk.recursive_proof_indices[9] = 43;
    vk.recursive_proof_indices[10] = 44;
    vk.recursive_proof_indices[11] = 45;
    vk.recursive_proof_indices[12] = 46;
    vk.recursive_proof_indices[13] = 47;
    vk.recursive_proof_indices[14] = 48;
    vk.recursive_proof_indices[15] = 49;
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

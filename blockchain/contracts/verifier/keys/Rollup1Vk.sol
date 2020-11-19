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

    vk.circuit_size = 2097152;
    vk.num_inputs = 38;
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
      0x041f1ed403662454014e572ffa143bb2087aa77fbc8ec500aa5ecd504d530d8b,
      0x03371062d58a7c25a4d2f0e0ad4555227c27fa44c649b2a82621a1ad35c69380
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x05c5baa990b86b05b250dcbac90106775408983f3d7311c5d5e292a5afd493db,
      0x29a639154ba2ef4143a5634e8e6d1356d26a4ccfbb10f1752a1318ab14f53fcb
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2adfa35408f3f04e39b127cfd9fd4826b2b97cf020fcf9845fe90246c2079004,
      0x16b7b332a1eeeac360fa0e7db1df6356357744aecda290551a5003ae16e7147a
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x020dff378d2794ffa9894aa508eb530887a89df287d1e8deec6cb5611624184f,
      0x22924e737242a311689de3a27952c192a446dd167801f49508aec6b56a556630
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x15319f036c4f6e464e502b923d8f529efe755d1cb3f4b0684e21386feb33a8c2,
      0x050b3052eb29b951a26115dae0f99d719aefab6a10a39b433bc823a51e4e3ff7
    );
    vk.QM = PairingsBn254.new_g1(
      0x1337cb8534c05213d9b73c0add000649ce8b760db433228b471ffd1a1ed8253c,
      0x1843deaf6309c9273e863b49bebe827b75ce093a9164e67dce5e5780dca55a4c
    );
    vk.QC = PairingsBn254.new_g1(
      0x22f4fd86d5aade9a8f78a3c9ee742958a0ac7a6617b1b804ced79cc0dd6a48ec,
      0x06eee8e35bb07e588da18d501e7e3046905f51d1452eac2337c346da15528169
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0e1623c5876909ca2d7d25943b43fd367678f2f9fe5ca4abcf07d0cde678cc30,
      0x05b5754a99eb3b410f60ab2a3505d8e071c1d7f6a6bf9091faad280843db7e0d
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1f105ddce9b5563eeb296bb34ecaa9cdd600b7b798a3336968f1e41f35b7a8e4,
      0x1fce0040aaabffadd21cc1961f0b498975e34f693912689317fea902e3b2c5ec
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x20bff956642d27521fbacc37fe1429c2fe492febe25e83ed169251db66050cdf,
      0x254a21c01e7578a16c8038b95e2754371d3d60ed02bace350917240b43f62ce1
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x27d0823836f26f2ea35586f1c36efbde72457f872edb180f2ccfa98ee5a69cd8,
      0x1b544722a07548dcaa58b988c6d85fde739740030e5d234c55c9c94a4757100f
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1d7f9f137d29e8daab6ed9bb5cf2896bb268be623bf8cca9dab4cef5db207617,
      0x29f68d8c65e02e7bfdbbf695470bbe65f9e1c7882daf42f4b43462e75d578efc
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x189c0882d49a1c4c6bf5dfab88dfc0ee797946fb4478ae5959cff3e7dd38acec,
      0x2dcbb51b081ad9e5b7663df87e488e09eb6e170cae78e234f18ed2ce87aaa099
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2143ff3e5e049ee33cebcf40f1ab6264175e2ce3cd598ea3e06fcf93365947d9,
      0x00cd5b405e59e651f73c4a8769ab24c01e99c58e592b991082ae9f19ef92aec8
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2cc9a3903a6316b9e4b1a5ec932f27580590fc69094296a606e0dbd747f3dd03,
      0x1a2138bae2b07389ddabafbe0693c77686b37e244f8c4bf13a23576d1ad400dd
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

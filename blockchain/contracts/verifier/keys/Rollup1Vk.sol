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
      0x286962cb2f4c2aa53b469c791346b53b3550b1f8f26a17741c0aa49e8abe27d8,
      0x173a8c2bb00debd954d52c72cae6ade2c383f10d3993e7a6e54caae220d5c659
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x07361e9d9bcc3300fb284e59275ff6b96a109d792c20a98193f959738fab1b97,
      0x2ce65d514caf623c4bbd0c5d9c4708ff24afb559e0d7b2cc52191cb052f0a16e
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2d7506e84dee223bce571ea78b42cdf9c9e55dabff3cdd22951173843bc31c97,
      0x271a5f89f5fda730aa7f452f24463aae45ca458165f3c6b305513bc198a8390e
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0f3a51858e1b5f83cc72327daaa59b6e6c42bc6b3ff0feb273e4472365d28928,
      0x0e3711f3aedffba74040959941e128ef3db260d64e9a179c19f636d9b137761d
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1169af796fa83673ef49467b0aedcd61a1efbb0ed40ef28773229dbee3eea6e2,
      0x2aeb0307482cb410b353b26c911cffa0e91191cd6e9f7486b6c68e88fb6ac6b3
    );
    vk.QM = PairingsBn254.new_g1(
      0x2808b0e31811463dd826eeb6881eb7e143ac5763a7de6f9d2f1a7fdcc3c9464c,
      0x209996efa660e297c42086439e769a15a6d23af832d8cce0410d95bf35e98009
    );
    vk.QC = PairingsBn254.new_g1(
      0x0fcfca9857100872da41c933f7cd6c7887c26c80ead810f86245a5bc9e45b8f8,
      0x09e011ad49a759083c1087dad26028e1b1177e32a759f260d02eb658dc403ace
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x196479a0ec4e0f9a2e7103d2330aa2cbeed455f4cadd438d8d96f820d34394ba,
      0x0742df9f99bfd4a207c4f834e66e7c8a026f93ab62213b5f9202fa247df728fa
    );
    vk.QECC = PairingsBn254.new_g1(
      0x24e2a8d40e0be10bef014d6a7faaf869d66e69000662888817d5de6eda48b9a8,
      0x2fd6209041bd044d69addd86105e6ce16b435c1cc097dd98520244de63b64c3c
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0e8b0d53afd745f49e691fe703f1e329f8248c56a429b30bb396e61d8a21862b,
      0x1f602ae1e9e89d5245085d305a72921bfca0af494b9fb0ed60c3854fcf488630
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x10d9dc70b25638d86089a23f6d4be8a179a13051db8e3a1caf26d6e3dc46bb49,
      0x26165b5a860c8b9ce4d8a4bb5f7bced60e21cf1f5a2ad66add1ae72ba6c1d826
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x02dab862bb5cd8f7a727ee133c83d623d338c21aed3202786297b0e0f41fac11,
      0x0d2277dd04c67693f7d7697a542ed9fad5744630ff18f9c6d30112cb36c403ef
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x15798f83cd4192cc6c18fb5c1aad894afdefa6996ce933f56744742f507f4107,
      0x1dbcface20b3260cb697aa5d6a4dc8e7e473d70749ec7367452a6b3dc19ca77e
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x0771b9a2cc15d6e14b49e0d92e2eaee3a9f8230b9ca37f13bbd2e6cf88399215,
      0x13626fa6e5291c80d0eecf71303eaec53cd8ddf45df9fc222141a97e09fb8444
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x16c0d1c169c1f5cd04e2cc40c51bce40a48e1751a9e428b537eb23d9c3c73639,
      0x280820f7524f087ccd2d638ed672729b187b5bf840ee35b953d4abf76af590fd
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

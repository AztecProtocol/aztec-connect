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
      0x2fb009e3d30d1d306d2593ba7a6d470474c6a0df81eec5e2801a9a4a0d6d3f0d,
      0x041a5126794aca62a862729962c6a023f84f21a7a1643275cc02dd3f4a645084
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0a527650468a5b085ebfaa88b5d8e3b7cfe9e3e1c8ee104125ac57b40151cef3,
      0x248839c87a39029c61782fa83036156a48b132823674509508e5057338a668a0
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x04d9cc27f0440667f8b4b02b92e46fb5ef107159690fd81456bf0a144e7e43cf,
      0x21764aba46997ab73020405207f5b2bfb7ac544dd860d98f4fe9f201d475f63e
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x24df2714c8b779618aaec166eb791c99622803df63d3fae6f0ab6cfaec50d16e,
      0x143e5033b45ea050c7359dd68c0da214fade7aa9d673800660e8ec9d0ffb7564
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x16ddceada309a95d46883c54247041787323e45d6da9fcca8b56162ea342eeff,
      0x1cea687fd9e1e428ffb67b17d4563c7ad02ddc6afd414f3c6384b35b07bf3e9a
    );
    vk.QM = PairingsBn254.new_g1(
      0x2e1f29977a99d5539a139ec8adcb0889c91bea6c702a3be0cac3440113919f96,
      0x032e823edd4b7bfbb79c1457e8cdc57e724db8d5439a3f70e14237d2657987dd
    );
    vk.QC = PairingsBn254.new_g1(
      0x278425832d7fe29d156c5d92b5826d84301a30887dc0415ec70cebfa0bdfbad2,
      0x142c186479a81aec46fb869865497658f12c5ae15029285a8978e2537cb3c039
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0c62c857269e2455f3f9ace24ce5a518d0573c69dd1e24f50454dea5d350b04d,
      0x2fc82e4cf324de86d6d3e286f4b4b97b9d72a792abf230f8635160c148fb6a88
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0b135435544657ca733e14f475a5b2d8f1b5df4414df8e183c2c95fcc05f8620,
      0x0a762291ba0f4303b173e9dab28858edb2efc6d48e030823b47a188b82f166c6
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x211d9efc9b9b14c1659be17fef4ca96df3b12eaea8faebb4e87f0e2f7365d84b,
      0x2003fb6d9c6c09bd8da21225caa1bee78fa5311d5b7bcc82d5a0dc0c0948f2f2
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x29d01e5508cfd29955bf82efe4784613b705d2a761799c12ffc30ea4da82d3b2,
      0x082a1c5c91570d8fa8996a4d55571c2abf0b9c2434d4d26abb3eca21a7d9131b
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1f6e6e42cdebe0b7463d1d8a2979b786bf50acc70a4ff78c254ce4c9077b8065,
      0x2fefa7314403758fb3802a28cdb1fde644e2d9387869c0ce2702d25c42b98118
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x10a2843d615ae57fb843fa9439cb869c5dc0e78e264ccc7df7e1b0680bbb02f7,
      0x20abc40b5d685140c4834f20e00a437faf2d73ad7d368cc588a7d0ba5d78a535
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x19f1880be5a253697dd12b636a1abd882da4c1f9e0214c66544083d1a7ac2b05,
      0x282b350b5cff8df3ffe84cb15c853d31760e77321764470ceed3bc05cf0ffbd9
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x226d5930cff2a993efbc40488b6adb5ac5b3970299722869fd09f698097563f5,
      0x28d31a9227c87cf45cbeb82e2735075b72ff6429eeb5d2f741841ef2daa500b9
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

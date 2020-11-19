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
      0x1e3f9b5aec8c1857eb4325022b280441102cbdfa700e9dbbdc1f82c0da4ce334,
      0x0b4431c7f093d87ac2bd6431f92c4616553a5f2774607f3917b9e59693b3b79c
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1967a4954de312aece27b9be68cb0fca881a8f9f05ea30a803889a3c784bf847,
      0x0252fa74a0c6e8e6ed12967723bce1ac4531d61d1d01b5e24b1553e7947fe827
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x1ebd77c31bfa260b99e7b0fab041397c74ea3bfb08737ffa9438f5425f83954f,
      0x1dd0328cd164d75f38f9655b9fbe584eb9c484bdea5bad83f2d635337f530de7
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x29cf10ac7feba8a08da68820f2b797e41caf1d0d32dc8e437952c255f9b12151,
      0x185ec8858821b56ec4c512313c13c187f9d701418ecde3d21c36f837f9fb19db
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1a1d08900463a6c4ba1e3279a0a3c4848855860e063ea45e0270ca333d667104,
      0x07e44e100d53083ce5c4b8c299a139cabee487581b8d7c36d7903e46ec7525d9
    );
    vk.QM = PairingsBn254.new_g1(
      0x301ef0741f2c577aba6f5aa82a2dcc9692200367913c06dcc65ffcf575f0c98b,
      0x1cbba0136dba538d56766fdb2f04777ceee988d210da492d152869b70ce0001a
    );
    vk.QC = PairingsBn254.new_g1(
      0x262c91dce9c1bc07185fa697162d813ab3c04888b8035d65fa0032734fbbd096,
      0x07e2e0f4bf10033ed97a20f1fab19b03f1e9237c9095c4f72d1200758f621383
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0ff54108fb52ffe4089366be97114a362d06d9c58fca0c962239fe4970678e43,
      0x0aebd17218b6004bb300699c636577c0f0d68c08acf4ae4ab68de57dbf1fd22f
    );
    vk.QECC = PairingsBn254.new_g1(
      0x2cdf832ecf2e83cccbded247e24f0ccd479d856714b1299c5d13dff0bf478791,
      0x19536d233313fcae318a5427d167cd89cbd2861dd1eda0b1356485bb9efa45f0
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x160aa89682d1d715fcb49b7e5fd0bdffd27e7bfbd9242476eb8a8a8cbbc7c83c,
      0x2f036988f0a016238daac23a9e0c602b074f200768221e88e16f5c52fe82d211
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x3044d7034e10bef450eb3c59812f9cd986eb4031f6190d067971f4cd3af0397e,
      0x2daa80e09b403894be0c648d725a3bd7acee7b8f148d45bd9fb0f382816667a1
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x226d550ff8d7293ab3ed948a8cbab83293248cfa6d1d6cd1365f2a0ab8addc09,
      0x1361135fed9b0c2d1a1b2c705978cb811bceb2ebb534b5dc2af1672f56346138
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2c0bc33efbe77496ad65c17f70d433f270a6b9ab861bb36fc877f96ee3bf6403,
      0x2c56eed4e68f633864afa34e2610814953e599b73aa284700399f87c9c37d203
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1b130ae67ca4a2cf354df222949916d7728030fa4ca51d40bed000aa49e1a320,
      0x1f5efac3c055996db70489a9b340d01a2af451a00ee2dcff94516950fa41faff
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x09d1674def7ffa65c82e9c6dbe332b7af0bd132fbe622ae8f9e78270fd3b11c1,
      0x232ae8b08065f28f49f894eda8cce1e81dbba40083f2f9308493d0c0e1033386
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

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
      0x0f0c174d8034ed3240f8d3561ea258fe568f8ed28e4ba45e5e0f1478f6560d7d,
      0x05c29c41a758d1b03282d5c13d7eaf3b4224b8e6eea047a35dc51418d02e096d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x11d100a39f1a8a660c7a77028475a16181a0a19393aaccfe957e16900a342c44,
      0x25341a476dcf9e3108cbe8bfdf097f11868c0db56ad66d96f26d2ba4dfd9fc51
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x23336be915040795c556780e056408808df877670ca4d4352c02de1b6af1b373,
      0x2ba04044d20b9c65f53d662c770831169b78d91be04ccb748c9a71b93d5f054c
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x291533a364b6eec8a2409c4c13eaa866fcb36414b10e17acb5b367831162186b,
      0x20ef52798f5e84331713452468881a9554306f2f8009966a82c81895915e57dd
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x03f8e1f328426c4ad7719b66f8b852a1be663888169107497ba440743193e801,
      0x036340f4b6f198713670e154f98f972bff8e22e45eddf687fbd625a215798dd3
    );
    vk.QM = PairingsBn254.new_g1(
      0x01dc3deb7449444c9534c9b22929f3c8118c27b4f07ebc26d1143cf385df0cf5,
      0x115c9855922c32b4850d64e8986a0ea54a35b85f8bac585e5c492957627c4d5a
    );
    vk.QC = PairingsBn254.new_g1(
      0x05ab2796d070c085345bebd3c901b6e5b6f16d239ea9e548e21ded7952e4a14e,
      0x2af298bcae9e5add2bea08b16a8fda386a1ab1531b823c512b09b40f72023f23
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x099355587c0b7ed5f213c8384c7bd751c9d9a84824a19fa8734d383a0ccda5be,
      0x23e047ead52db417fc6d3ac988a63e1b922e47a3dd812ee8ad9f73ca9fecf3db
    );
    vk.QECC = PairingsBn254.new_g1(
      0x07a5938980f5965068fb533fe4d2dfe1ecca136bd5a421b6efb2a55fecde8b98,
      0x2e57567c64b6d1cd2777d95f88a638bc46e2e1be9d8e9698bdab3a3148a5e34d
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x00e5a793798ef2ab1d2eccab47b994c86fd706b53dff7411c080b840c8a27c60,
      0x12f2456479bb64de1bd8e5925784059d76d6c7ee4fe6ba8d78ee56f8cffdb32a
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x220fabde6aa156ce4bfe440a19a6305db4b4f137e49973923cd7c2bceaf235b9,
      0x057eed4a10d83e799285087562f36f277feaecda8b782eadb0feb03c43e0f0c9
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0a297e1f7eb970ee2fceb1e4cf5d4b4735e707e6ce45431437cdccef77e6ddfe,
      0x0d24b1b83dff4552f18d9adc0f7602d31426c5363175267479ed8342fc625d15
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1dc4ec2c935da53852982226eaca18f164476f2c25804e65d2e0a234c8399a22,
      0x1b6a275c4f5744fbb629ba1cb2fd52dd042453f6c5e01e625ad6f74eb30ab708
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x22a7de3c310d1108f1a782093453de16602424368ad0e65d4cfa4eb68bc894b5,
      0x2bbe5e0536b26d3ad47f79af55015a8c108823d20eebc0239ec7a170699ba5a4
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x169cadbb95e414d517de35b64a9e09784b6a164d72e193755f5f04821bb49000,
      0x2f54b9ffeccc725b0773bece9a6d01624e09660286d0d776c1e6260528ee456a
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

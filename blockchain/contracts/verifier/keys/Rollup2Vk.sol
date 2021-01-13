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
    vk.num_inputs = 51;
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
      0x2252cda360559c2c6164285f1c5ef50bcbbfb66626614051ccfaaacaf8bdc3e2,
      0x1c4af65143f7ab2a750ec69c6c25874196dfb52fb2ec9762ef90d4bd03386769
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x15a4b3a8eac9b86c975f65ecc1bc9c3bda70bbc9bc79370ee36a096386b1deb7,
      0x05918dc5be31fb77c8d93865da485b6363f53f1ad3261490c1b37aa0a8254718
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0fa050e9a25d7b83f2cfa3dbd1090e1388b6a3ea6a181cd9471835b3c8b4bf30,
      0x2e16e8d9ade4d9a37c42b11d0ab79f41d429d438fe184d5f9663fa358b529783
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x07047c6e9e387fe8db01a279c48234f079199a4c665fdc5f1ad1a8db3dbc0461,
      0x2930cfc5b5a321ff0d13a538d12062f02b1a768802c9c635d5e21d29f36ce94d
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2d4353f42f15b738a1a1fe34cd29c7d26730098755d2c2a5a89f9e9c402d6fcc,
      0x0190b7168a523da1f8c06c9fe631bc988af56a492cf1762af35ddf40e899b4a7
    );
    vk.QM = PairingsBn254.new_g1(
      0x19a5532407035e54e92c482b193a123b67bd5f1bc87685759f5b9cf14e8c6a20,
      0x236286f15cc93a8ad3e39adbdc018c8d15390dc14da3ff48ffed3b357cc81317
    );
    vk.QC = PairingsBn254.new_g1(
      0x24cddcf36012cf44109f42823d914d8c1221563c2ab35acbbe765709fabaab7e,
      0x010ce776358ad1f20c7a91fdbb44c90794b257adaafbed2522fd7e48002480d2
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x07013c7173a3f0f7aa5cb6b596450edcb890061ad9b08ffe43572852f7890433,
      0x046ce931bbbd0f8d23a212522bca13da6e4eafbb55e8da36d5458f596e8a8f4c
    );
    vk.QECC = PairingsBn254.new_g1(
      0x259bad21bc6ec9196e2a13551faedb40eadab6e7ffe7cbfae2260f254a3504ea,
      0x088f8ca6ae2ba98769f5694f0b3cebefc87ef9a171f8ebf9e61b088e5e3ab58b
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0cb6581f2188fcbcda3d78fc3e494ab28ce310828066e01c88423966c7ab173a,
      0x04bfc8ed2db339f7defed647aa62f34f8810c8e35c8b6962083ebaee72d39847
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x161ed91de5f8f56ed69cb5b87a9025b9e720cd906c9395c0c1881b2b45c51132,
      0x167d51108ef614d8efe35c1283a28ab5660c35edfb1166e31301b2cdcbffa410
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2a8f9061903b05482a2df0a90b4be3d1a58bc29d582d2636101e12ce7e0c42a5,
      0x23bc43045e4ce924c2f99107746d31c104a27d4c1a4b989f31fde19fd4aad5ff
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x20144f2745e357eb074d805b5a3398f978babb719fb60943a65cf68fcedc9b1e,
      0x104f9032109471a31a1c90fa45ab5af058bf961b7db6e2112d2b8a7b1f05fcac
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1f77ce84e3b0987f0e0673b2550128f06910d0527d5361db67cb336dbc66c2a2,
      0x144856cc1bde18ea90431f4a02d1feb0fd74e7f5728ca7b3bbeb3bcd886062db
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x25262e950072cc35feb23c9b9f3b8256f5c174ee082695ab453c3543933266d9,
      0x0ec3f8d149610b38579533f8f6fc7fa5afdb63b8e9fee82a1bb87ae315bc7d63
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
    vk.recursive_proof_indices[0] = 35;
    vk.recursive_proof_indices[1] = 36;
    vk.recursive_proof_indices[2] = 37;
    vk.recursive_proof_indices[3] = 38;
    vk.recursive_proof_indices[4] = 39;
    vk.recursive_proof_indices[5] = 40;
    vk.recursive_proof_indices[6] = 41;
    vk.recursive_proof_indices[7] = 42;
    vk.recursive_proof_indices[8] = 43;
    vk.recursive_proof_indices[9] = 44;
    vk.recursive_proof_indices[10] = 45;
    vk.recursive_proof_indices[11] = 46;
    vk.recursive_proof_indices[12] = 47;
    vk.recursive_proof_indices[13] = 48;
    vk.recursive_proof_indices[14] = 49;
    vk.recursive_proof_indices[15] = 50;
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

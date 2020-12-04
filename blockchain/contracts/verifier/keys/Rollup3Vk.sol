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
      0x02d297e396c15a943802ff412991f84d245617c84a231b9e41e91ce766b3707f,
      0x1b82a96a0b2c943de4dd6ca7f1f53daade6d4aead9c6c2e4b084ff1476110cf1
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x021e6eb570374836cc5b6510fd8ff8f316357f26da49899d41645ede21367542,
      0x15ce59ba9e4f2f6c45e38988337dbee341f9ca79843764b507046fefdb0e63ca
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x22a42b4ed55d68b22357d9ae1829d6340ac1ad5ac879145acea66d4d7f2ed956,
      0x3014855a5b190f57d5354afcf2f40a2f72d124e0c2940e1e45bb5746c699dc2b
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2fbb0420c88da1b2034a750d37cd8568c8bf3adf8082f7e25a9c9f595776a18c,
      0x1fe2570c75c55ce58a1c91303e323d80272cea37518310a136fddc492e432f34
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1477ebf5e13855258d3af44d88696e44680bd56277b1fdc862cadb9fc32a6cdf,
      0x036d80fdec31100fa55698ebf041da3d7cbe5c2c0055df087bb9199ebfed8ac0
    );
    vk.QM = PairingsBn254.new_g1(
      0x277ca6c320529658bb15ced444b864d35f7ecd4f37243ee616f98ae06c92dea6,
      0x0ef9d5b635b877ee1caab232f64d6bb091d73ba229e9315bb1774a7a102c14c5
    );
    vk.QC = PairingsBn254.new_g1(
      0x11dd84cd08c90ecad21c41a82bd261e65adb61541f7326bfdd28bdcc85ad125f,
      0x13f0ac57083e4d3bea9f1c47465f5513cd46bd37a5f5cbf1c6d6985c5ff97c94
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2e4ed5637bbd87e3da7acf46fd9283e4f77eabe6e2404ab2fa0c5f84c6261e6e,
      0x0449a6bcbfb05d5b61c3bd9c116b3200fff9c8754584067a01f4bac982f24ba8
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0bb02341788667bf10938736256e232456f8c94b652532940a1e5e4c437f6f91,
      0x003e1dc17a69171d35add17afa959b1c631bbc8a491407d74356177cb477fa01
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x273538dd108077839ecb5cabbeaf28f8805c52e0d0455d3fd73a8d78ca911e55,
      0x19a72c7c659511c6416986ced7fe4318213d93e986bf9ed3daf28ac2b95129fd
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x219db31f869ac1291955176f48d494cab170d4d69a097f67d6576b7cba120eed,
      0x03c9bb9d172ba310fbdf3e64a957768182d7ff4db4da13bf7b281242642a135c
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x2cda98f801587758de59fa1efce8bedd54e26aa65e7d945b8adc75506e6a2c6c,
      0x05fc13e330a2947ae8651fac04eddfde6f7601fdeaa0a7a6fd37cb4a1cb92ab8
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x23ef7f4c92d5faf3b70b7b3c1862cfae9ae57988450b05196f2257d402a9d576,
      0x2a1f258733eba3ccb512b94cf144bf3e34c8aa24d62c8a9a9ca3ccd883fb6e8b
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x01dc32a1a85b8498d0abe8a59ffcfc91eff9ebcdba2a1671d11a442352808e8d,
      0x2ae758968803c3a6a2c00705beda08a1693a5a86e965949a8e985459358f2a91
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x158fabb1ea39224e6efe9a6f7b14fc4ab7b522ac4e0bec8a51e45c53d5f03e8a,
      0x1fcdbf1c3f0944fb3e1d74e3881b0620f7b0f207aaca18603b10840d1cc5b3da
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

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
      0x08fd70127a5c20bee6ba8e9ebb6d9da08bfb59bef31f2905641abfdab2854c26,
      0x09b32a205eb88721e2b32168864e06cf1d0b7642357daad9844bcad7f95fb059
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0202cc4add87ba13a456439e3e5451c88b890386d2e6869c8a827b1e7aa90ec9,
      0x1a8ac59e1f15b88720ce85d3e3fd19b65a9f149cd3db615e9a053f63d95a5b08
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x099f8e9d5f6d609b274615d1c8b31d13ff896d6bb5217257d304eba847cf8e6f,
      0x1039d58dc22d86d1e5b3bfbc5ed2f4ba215142be02940bc47d39fe5a76942c12
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0098b0a141f6020e4674c8bd124d264146cc6f7a02bdc3b41d0c09c10e11700f,
      0x15b896f350e60d9e39641cbd00ebbf844bc7ec546fd0beb6958d2d324a5d278a
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x07c05b2a809f778acb501e1f358a8d6462a69ff94f1046efb17f974a7e953558,
      0x0a59ab53f01b4591923374e313fa76aa8780fd749b5794a0b4d21adad2cc2053
    );
    vk.QM = PairingsBn254.new_g1(
      0x2276b7ede84973ec3bca27ffc911d4869cf1cc315d070bbf65f89317f9513014,
      0x0d91ae11072a99f12686ca4a2eaa260dbe50be905d2ab9a2e04b3a009906b5a3
    );
    vk.QC = PairingsBn254.new_g1(
      0x07013762b268f1435bfd76cc7c59fad1bd0229a06580efa7746fa0bf5588a75c,
      0x205f69df80e060c1bd49f6ca6668415910c02e77eded9cb90679a9cb7e49904b
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x064341fec448f5e3d2b75974615b3aec02aeab9b37f9267c3a7726fd75063b3c,
      0x1350822cd8ce6807b31f07963b0d82eac7336633d13dd3f6a09a338b56439e70
    );
    vk.QECC = PairingsBn254.new_g1(
      0x28f841afee4e39240f9a70c306d0ea5feaadc3afd280119dda9c8b1a988cc27d,
      0x14563d018d48dc5b4d60302531d8244ea267e9c4d5ba5f15530c396583e749eb
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x0e6ec9fa113457f7dc57e883c13a06c7296983929772cf02dd1f1be160ebdc56,
      0x246aa118c9b4b02e15cbbb4aecbf857b63130b8ed2a6fe4e3b69e42c7db22635
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1784aceeafa951877d9f65d65777ec7f95a3dbcbab4ebb6dc95cbbd33f23a045,
      0x1ef236b2b12621453a44fe85a2a76325d00ed9ffc82cc9908ffe36eff17eeec3
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x04e21d7686fc9e2cdc1d1ef17a00fdd1816e8bb3709b431b59b0edd6aa32c782,
      0x277c17dc6adfe08082c5295e0b7c37562e7131b79c78106e4a70c891a87dcfac
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x00fc888f1e322600a063039c1dab6fc0bfed23f5ec59040cfcfc29627bc98851,
      0x1187bc7c9cc07d9ec8ce8989152349ac0c71c6de50fd11016117ba3eb8f9e219
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x224c6f211f2b8d6765cb4b5d6256b1c228fbd88c5f1f46edd1e3a6ff6a3c1b4a,
      0x2d52e00d4f8dcb369452322fb7c72e75f9e921f60016e417244ef6520c46a43d
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x1a98acd0f260d2494f031329bab387541d3e3f6cfa0bb35ca8ef9ac5405c7b6a,
      0x1e1d7e3cb41cfa68e5c3bb08e4d0b87d2c5c0ffd18a0a80445e4eceb20383b8e
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

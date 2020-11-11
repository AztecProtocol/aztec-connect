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
      0x28012ceab8331b42e12772ea142e19323f931a490e0076ed11b99cfd75c4cac7,
      0x156bedebfbd940e99b9b2b7f1e0f3d4f92d8abc439f0e57179e9c2f288911a87
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2dc3d841ab21a84807c235f19bc016797e3c8207dcc8d703886cd3cbcfec2a24,
      0x26b51f259e5d385d9eaac6cbf0cba76942045682d54946334c0cc3eb94005aac
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x2370c7e16c948497b995d38b13097ad90d304fb40c3ba0686177d908fc1e16eb,
      0x067c20524ed14f1d65a8711785edb85c1fd306c5c469fdb8fe597e82044cec52
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x254c697482563607d7fa8f75eebec247ec098f33df0d1fddf33feda3e4aa512a,
      0x1c01754cfe393b10c0847132e5de78637bf240dc4a872b1dc1309efd4c2d4c7e
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x20fd521cfb7d3b3e1586d93a525317e3f94761430347b43f7722db67d8ce6ad7,
      0x0548877ea45525c4ffaaac1b479236d2c776875d1101451819283fe7b360c5e3
    );
    vk.QM = PairingsBn254.new_g1(
      0x1f27eaa70f0a3ed7f6c104ef181d5946dd42484baf907c4b7b7d68468e278b2d,
      0x2729381f888ffa04286566e70094df638f05b79d2ba16a62c8cc36c03aae160e
    );
    vk.QC = PairingsBn254.new_g1(
      0x21670c52568159f886786798edf3494ad5c093df5bcb10d11699de759d0e53c4,
      0x12f153749e47d59368efb875dc70303f6308b73c4b90689be319c6464c3e22ed
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x26993e19002568e0e41fb6de7a71821e46131d6accd885fba425fc735c92ba14,
      0x20aad3a842d8be88bed4202633eecfe09ecbf68b4bbe68cd8a6fc4c1df80c9ac
    );
    vk.QECC = PairingsBn254.new_g1(
      0x05c204db3dd737985f9905c118ae846778737dc13485836f3ff091f1815cb07d,
      0x27e24a58196ae653f40cd92dd8c7f1b45b1a500b41a5b2c02e4088c7ec44dd8c
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x1838563b3caa04a4b80b130eeb443f0e0948f14d38b79b4cc25bdd71ddfb4d8c,
      0x2b6e7c6affd3a1f2c0be87f5da643eac4bcfc8de03ce3db035f9ba06b3b9df56
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x071362d6e1d3698ce98e72b4b96e71241995717d0ea97e49d486c2372bccfafd,
      0x0ccd336f7300b6327df43ce7a3ea9f573f91e6729d485aa48f36e812c1091dc1
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x06f1a2e20369189c05064765a39c3175966d3e52cab6fe07f66fbfa02313bd0d,
      0x047d416f3fb91a8ce50ae9511ec3786b19691c7048995749c1036e3e7c7fe27b
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x1cfe6bc11420ff487c786aea7335340a487d015a3b6399e96344c8380605fb53,
      0x1629b1ef19379e21c4171d78ebcec6a27dfa00e65a8043cbac69c5f74dabfed8
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x190b884ecb32e318d7719436b55947a5ab6ea7580179fc1cae387940624b2a2a,
      0x24c90058d11fd6c663dc23a3a132e9f095dccdbc10c353ff564cbb18d2591aa2
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x228524800a7c4bda956568b23f8fe22aba6ab9771608d47ff29d6bd1fdf3c87f,
      0x130e7bc5eaa071bff1e04e8b81771473c082c44c69000b93f5f063d4ebb140c5
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

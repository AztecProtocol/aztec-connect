// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x2Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 798;
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
      0x2851fba2ecc000acf7220987292853a5c1d53be068b105ff9de3780074cb1793,
      0x21828a7252fd67b84c51b9d6982d97417d27717f6a51b6c93e97300d1c14a9cc
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x188c0dd5ed510dfaec82d439a41f96144a993056cb27ab82fe29c7280c96ef0a,
      0x25b4bbcdd288611d202de54590c969ec05e152b45f0253fac71cbf94e19ba338
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0e9df11f40419bbdfff48efd72c2abe03f4b724039e7503a38d89d500bde67ea,
      0x0287bba3b9207555bd2796d869094aa7f23ff502e998a741eeef8045f2703903
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x0b516a57c852c656a844b7cbef1f48c1d6840f4892d713e817a29408f3364d9b,
      0x29a8f3d431431f0b3b2835b8cd4a39cfb87b648250fc3bb82653c9be438ccc38
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x249782b1aad1d8934c75f6db570b4236173cc16958107df85c3f92c285a44b10,
      0x020d35e04b0be2cfb47091335861e69fc3fe765fbe8872179a1c6168aeaad55e
    );
    vk.QM = PairingsBn254.new_g1(
      0x2f4ca26da448fb9a2f2585e1f790a7bff3b18cebac743ea93ce6f03ebb49b2d8,
      0x18702a0972f93ef00da4f21e861759302f38fae52d271983fa060ad63f7f1e25
    );
    vk.QC = PairingsBn254.new_g1(
      0x1c14ddae0eb50eaf309fc1f36926189dab6a7192e72a16492c443aa2fce6391b,
      0x1aa34c78e7d320724041492e6bd3b607f8e6b6d5552f633b7d218e5b5cd32a42
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2e38e6252cac51d81c102098b0b37bb75a1b6a9b5135eedda93b5efd97690423,
      0x217530f9f78aae868233649b6ad1c249bb3bfa0ea00f2bdc39a2dd6e4e3eade3
    );
    vk.QECC = PairingsBn254.new_g1(
      0x101d35ca0d418acec1da102a0b30a5493dfd0695ed781f447b4a32756ed6c55a,
      0x140514e43aba2576b34443144b9fead36ee85fa8d35a2925a4a38b8d3e216574
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x051b63890c9b5cdcf5393e50f164dbfd7a8676f1a3de6a0b20faae8b2778df40,
      0x23973cede832f68167fbdd6f89aca606a05918fe5d707649a3b9bf4307e85bf1
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x16987cee793578cbb589ad2809a892cf1a50dbbb4e7dacb1bea98296689dbdf6,
      0x0bcd0ea4ddf722534eff63986a4facb34cf8b23a966c88da4238092c453ec297
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1466b5dc5187bc86515e91c63c5c555aece060705d7f2c4a3e04be90f51dafe5,
      0x03ebba799878863e1d37c301f398b69d21abb06ffa83f371ad366954cd27950e
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x296ebf67f13049813ac688103a04966d1c2c58a36ed52632114ee4b7fa15b920,
      0x03065a49e013ab3607cf846a0828324a6cf534802c379cbda0d16854d83c1514
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1585f0db20ecf0eed545e814be3552d065da2e84368ea5b1e8e17e0c6751054f,
      0x18b1d2b5273eca4447ee243c28531e116b95e92685dde4c8c3c0eaf0ddd11599
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x05d24cb2d9bec2af4d1f83a94326273e5a7fa9cc0646c470f43ec131b420cd9a,
      0x009c7822471176d91b892a1353f8e46a11d712ac1d7007ba9724a2096e2f4e8e
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
    vk.recursive_proof_indices[0] = 782;
    vk.recursive_proof_indices[1] = 783;
    vk.recursive_proof_indices[2] = 784;
    vk.recursive_proof_indices[3] = 785;
    vk.recursive_proof_indices[4] = 786;
    vk.recursive_proof_indices[5] = 787;
    vk.recursive_proof_indices[6] = 788;
    vk.recursive_proof_indices[7] = 789;
    vk.recursive_proof_indices[8] = 790;
    vk.recursive_proof_indices[9] = 791;
    vk.recursive_proof_indices[10] = 792;
    vk.recursive_proof_indices[11] = 793;
    vk.recursive_proof_indices[12] = 794;
    vk.recursive_proof_indices[13] = 795;
    vk.recursive_proof_indices[14] = 796;
    vk.recursive_proof_indices[15] = 797;
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

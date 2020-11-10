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

    vk.circuit_size = 262144;
    vk.num_inputs = 22;
    vk.work_root = PairingsBn254.new_fr(
      0x19ddbcaf3a8d46c15c0176fbb5b95e4dc57088ff13f4d1bd84c6bfa57dcdc0e0
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644259cd94e7dd5045d7a27013b7fcd21c9e3b7fa75222e7bda49b729b0401
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x036853f083780e87f8d7c71d111119c57dbe118c22d5ad707a82317466c5174c
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x1e848c8c87b3391dd5a959f9ff618e70e78be74af4c60500a6cb50e97e25c253,
      0x1a004c8e2797f2b794075ad95631b3a2fb6419a942216e023d013a82f0dc546d
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x2bd8d0f2ca17128babdd18a90e0d028abd2d8d4aa1885923073aa594e5bf5892,
      0x2c69af108114723548d341212f6472f23558b833e9a0d3db9ee72a873b6e0ce6
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x1480c3c04a2825243d409ec3a8e490dd29dc0c39b1a6f9440f9a6d1ea7c82f64,
      0x04630bbbf9e06634d76ec0676f332075157850909c3b42483a7cc65a6bcac515
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x1b3bc1055bbcb31d7b850ca8f5c20390e8e3fae4fe4fdb68ab28de2abe1a331b,
      0x1720bfeca0268423786838dc8d50b4838601e54d6f540cdd74c71679a7b521ef
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x2a578e63095ef7b827a2b7216901efb60e1accdb476aba45560c64ed2900a1d1,
      0x1544ad9807bc22ff7f46735360075ad09b7a5d5a4f97f0d93cd8c7f40df0eaa4
    );
    vk.QM = PairingsBn254.new_g1(
      0x13284ff3b3c2838ee1d0158fa8f1b6cb5e8179c3aecc8abec1ddfba1067c5b3b,
      0x2087cf9c57ac44935efdc394257f6bf362b23c167a0ab6ffab7c6cec5b21c97b
    );
    vk.QC = PairingsBn254.new_g1(
      0x0ee846eeb5c9ea671a4f8d2dd5fda83c6924127764ab51ed93942e933dd0dcd4,
      0x13f94933b25ef5ba16f28f6d79e1cad3e75553947cec62a68c57c7934459cfc2
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x075e4f95494c14894d42d539dd01267d4683d30970921ecc9059daa3012cf13f,
      0x1220350fc48fa566d620a38f5cf5505270914a7322b9e1099f318c0a7073d1f5
    );
    vk.QECC = PairingsBn254.new_g1(
      0x03017d6d1bb6dfa26ac15341eba850d1cef835e66ee19116af3fc63dfdddad9a,
      0x07b33d9324e9bba498dd1b853df2d17179596e8ebe3a4100a1f111034d964dc9
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2b325d2476cca3859d11924cabe4a0ae58a37bbe1ac2c63b3de94d0eee208901,
      0x20b8438e795fefc9814b2ef022485ce7d84cb337d38af8b4147cbac8f184adf1
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x09688667db82bf0574d6544b22e02f1f833a13bd65467ec445ccd803466918c1,
      0x2d1c0e529218af9f082bbfa9d283d7d941920a46ae227c014aeecbed2f27da4c
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x282707933f1a9ed5a66757d1fd40534f99d0d4a41c14f8025366a475caf66e2f,
      0x0811529991e8fa05f360ec8ce9b4119cfe12ec31dec772145eb3b93b8f59befc
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x07bd027c9155ea2c6183adb8d698846349dc67f407756cf15c4ae4f3b9611edc,
      0x0b9358944916706521781f17c357b32dbcff017733b15f669d9dd19e52df46b9
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1727ffa197803ef87dbee2a16ceb03d5be110aac828610466467a11006ad1a73,
      0x0f295f8b8e40758f3380293e70f73b67535c5691010739ec7c4b432ee33d316f
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x18bf9a306138d7bc6ccaf8fd1af6ffb7c85ed3949c1a7c5f83fd4918b30c2a30,
      0x0df1407ad99f1675bf191ce8530b8307a670b5a7aa27644743407d6c2e0752fa
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

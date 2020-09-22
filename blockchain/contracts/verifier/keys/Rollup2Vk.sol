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

    vk.circuit_size = 4194304;
    vk.num_inputs = 48;
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
      0x27fad35838d5626dfbc3b1c2690d49ebc7146b0eba0545f5f56331d58d30e991,
      0x18a3e788ae568247cfb3f52526f87effe60bc2c4dbc5379e097e3663587923da
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x213e22dcaa67a845a4b3cf8225718d306e29fbea8b696331b3c421720be6664c,
      0x0d2fae207d23e38c457e56e40148a2a2f6a2a9cafc76705fd6e52fcbcb9e732a
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x02ba2afb95aee793454c115e0093592b2c635dda9864e95ec72af2f2c394c9c7,
      0x1c06f23c3536d294208ddca028180c60b4ba24067bc3f25e7d0f6bfe941abfdc
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x131fe72f18b8dc13f88972046017bd579f86c7ab041dd7cbee1d20e80cecd2c8,
      0x0ec1606e0cd82cf5d9168bfe9777b329a2bfba6a56b655e1f181bc3d7db78da3
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x1d25433448b329adfd9999a3bc78426ba6c37161474312b6364a64866cab91d6,
      0x10b07df7e30c6c99e0259304122f8bb5aaa9bbf6444cdd70c272cb86ed6dce69
    );
    vk.QM = PairingsBn254.new_g1(
      0x10976606462e96f90071e153ceb458726da94487ad6c3ab70be5762fc0e07973,
      0x19e5491614f15d631960d9e314eb46c882d6ed15248c7634fc9dabfded2c66d6
    );
    vk.QC = PairingsBn254.new_g1(
      0x05e7762580bbad9b8a956c11a0d93f331f64400b95c48662fe94d85314d5fcdc,
      0x0c9304ed9257c28dd0384d03b6190e7cc7b4eed7ffb76fc02baa7a4bd6ccaf9c
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2d86f0173dbea946a40b4e61509ed8bf2d1819b2aeda124e3ef83a4e5b48ee65,
      0x127f083b536881e2c72eca0de131b7f5e27783d32352a6e1e6a0b55c106c1b9d
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1f18515baf7ed92669812a6ec8368c7d23dce1e1ebd2feab61e66c2dadb13ed6,
      0x14aa6e9280e423c86131d0c0ac8020309d160af23ef105eb94205c1c58c53c2e
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x04d0354f3fdf85f4e5db7ca0d07899b01375c7698043110630d926a394524554,
      0x2794ab9d7a00aa6cdcaff2658abd6df7a19d2910ccf209bd227611080888bdae
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x219eb9420a8d20bb54374ac4efed794ee550d28419952ac54393dc94bf87e18b,
      0x1c0888fce2a2a4e4b64ecaf897616b29f188309df64ac77699073015234f2eb6
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x25451f45a22e82592de0c3e9d4bd904da9e03781fd4d87a933fa8449c1db6fc7,
      0x244f36e8049a254ed0891994048c50438ded939ceaad09b845ed8264bbf5cb4d
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x045c3b58ec0fb204bfae90720aef2afda244d4aa3a7afd2b59d034a912be03ed,
      0x0f231914e9a8777c5f3d991441fc1d2ae7667a7240af6646f22483f4df1f5a96
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1ab17c810b987bd95700a12fb2d670e1482caa3457d212c468fabf3df79d1392,
      0x1d12f56ec671f63e523b3fb829a221df97c8e742a4a92915bd666407837068a4
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2faf6c8cc73202f47bce5809b61970be9c0d781cb7b424fbb845c23bb20f3a1b,
      0x254038811e45a73a41a4cd644ff71ee9a06d534849beed0e9867957f8cef83de
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

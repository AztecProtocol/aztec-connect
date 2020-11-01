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
      0x1e89c889a010ce8ef172f6f875dcb0c1e5275a1170c529da0e3d5efe3a4bbb09,
      0x0f8ae3111902a02aaa4499e3e8d06b8c2b756b4613277f1c6307784abe41c790
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x18c68cfd9f0c6c956fc601b27d238631307ca28186cdb4c9aeb5bddf98440014,
      0x001ecdeebf7731ddff6efbdfd02ff3b4aabe778acad0b0186b7de75d7479133c
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x060be6953b138feab6f363268c19166a7380d10ea7e55e3ef443d89711918440,
      0x202e714b334ba0edc6d41f9b35b8555266aa1a9c4f3286b0979436e50d07c635
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x159b3407e05e57edaf297e00e29b84cdcad4063d65a1500010fa921e73759222,
      0x1945faff7d1666a443f9acc9e5819b01fb624a4671b2178d41b743735aea7b20
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x20e9a88f2967899a1daa30c10bd08bacf5b96a52892b7741b3e27b620429541a,
      0x1d5f8b398db905ca7441fff686dbd1daf02185d9e61ac9ac2bfb1d37c97dc358
    );
    vk.QM = PairingsBn254.new_g1(
      0x035097e58b7e5f9dc78e0e653daacf468df57b257f97d25497e48ad9a0498ef1,
      0x0fea6c8ba6d2eaf1a42713c3dbd755f7ae44d42b581ab357c24195e322539b9f
    );
    vk.QC = PairingsBn254.new_g1(
      0x046d25292ad8fe383c27f20d403bfad7b91c0d242d6a1cfe031101545ca22ce5,
      0x0199f71d132a6d7ad9299ab0f8b3579cf1909a95cc1e1ae4aa49a844f48a04ae
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x0c783f52feeccb7d42d8c4b43d38ac81cb1e429f2ef47c6d881b43e4a233f8cf,
      0x149ba6252aa47c9876ebe9e19a5f509fe18a378fb335861c57a46e89bc318854
    );
    vk.QECC = PairingsBn254.new_g1(
      0x14bdcfed64fee04e0774dc0ee6ec46f6acbd6e4981a24f05584569a1ce6417c9,
      0x15fc17011e302c4e337dbaa103c703568ce5d39879cfa1c2f017922b7c369b5c
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x10527b2c7e1874ec06cf5e2d14829468aa1cfe1b7ec0ad0266b83bd96bbd6490,
      0x2e7ba789003e80ef72b9c5a71d154b6b71c13a74c37f30409ce77e47c865029b
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x03f19b86e69af1f0cf675f6117e9093488e7f44116290d9c5677b3615c1a7418,
      0x16d20bf2524b14dd7e85d7f70a750f3e9f8bebf9c04a9862d54725afcc7453a7
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0f3a7fe70141c8b524d14dcd581cf3389905418cbea0f0ce08f5769e88fca47f,
      0x06c4a813da85cc4971facea9a3b5bf621b2a63758127ac97a22e54d74e7da0a1
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x180cc5d26a9cec8d85b0dca24fdaab3c74c559a0693dfd92d3b6b9a2607e9f9b,
      0x16ee788d4ad462728969405364040d89c2652fa03cdcacd369ade71720b3f237
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x1db112a5d2163359f9d98a2fc577f3e22ea0b44934904f6f51ac79f4b0b97cec,
      0x2d25920515737d946654faa6330168692c54b73ceaf2bf5475230153a45db39e
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x27a482aa2673d3bd08d3e941ebd32930a4beb836c0a6bda556f758706d557b3d,
      0x03abb66d021f428273d6b0d5ab8e85b2c41cde209dcdf45f991e9968dc2fa0a7
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

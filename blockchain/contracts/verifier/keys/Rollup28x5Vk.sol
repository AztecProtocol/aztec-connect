// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x5Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 8388608;
    vk.num_inputs = 98334;
    vk.work_root = PairingsBn254.new_fr(
      0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x1cd916ef21d269a9742eceb3680a2768b29d321605acd9cc038a1eaf71633b6f,
      0x02621179bfa27b40238cbb0da747f4ffc0c3a564eb4a3cd209412f10a1bd6312
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x1d603d482025dbebd8ccc47ba9d847e0e727c02df14df7f4c67dcb3eb5e0cea8,
      0x244e36e6b652ff7a3621933e57eca7b61bbfc84218665f262d323c9be13067db
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x10838fcd6cea67d13f9f963a69896178a499a4f1feeeb2768a645b73676d1d03,
      0x2eb616953d72d1db0daaa799feed5d0bdd5e896fb00fb171ca85ae1ec5ba3964
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2b7e618f5f60f4f47be90915a8ebbb18a69f6e8eab815a587ea2312cf5eda4f8,
      0x18dfaeb4839b3a8613ac89fc86f0ad0636ad6ee5aa0368f035e82993d3d0da23
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x044e12d1bc7d85a883f381c1defeed9d79bb21e1e931f60bc1851a348895b11d,
      0x2148983bd87609638a740324a13722796e3ac5e63a671b56688ba81bbe15eace
    );
    vk.QM = PairingsBn254.new_g1(
      0x2507d2330bbcf5e87bba63f4497f328a5dddbd828562ab9074c80303a34b0c84,
      0x189b2f4c8d8695c142f8223c277a894d9bc9f14cfcd1a87d965d81b1428d35ee
    );
    vk.QC = PairingsBn254.new_g1(
      0x23938ff968c74d17c273e2159e56a54209652ba71648219956ce8708d266af48,
      0x01f9c7852e692a058a52968263d8266ec5172d5364549ec0d53784872c63927c
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x03289dcd64c4f027039fb53419dc5cc12586638c696a5c0ac2a6b9d2c2f2a8ef,
      0x2f339c63e5f6447457f975bc6fd4a5881dc365f41a5d8a2f574442ee3f537b29
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1b143cabdc2b69db494f9b78e7c5ccbd575a6897bc4533abf68ca8a130677872,
      0x15401a72bc89ed54824306b3aefa1e930f222e357e37347e417d17d57e68cb20
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x2c56ce27cc05c721a4abffe3e549ec33399822ccedfd62c52da1aaf792ca02fc,
      0x2da256e2796ae4e7b180e99b879959158d39162f94ff542f230411d648efd0ff
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x2bb70bab404912ccaf4051a516b8a6e2aa51dea2f57048a8b008af3a010c95ff,
      0x0f0233d13ae5ccee4f3770c12df4a44662968f5b5e9a0094ee22eaa0ba4fc48a
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x0890dad273121d4b4462850386f24bc3f4a49a157d9355333f8f2f37a7880c14,
      0x1b484d45babe79659f27cbe401c792260f3ba03eb75a20dd347e6fcbfcf747f3
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x28c011859b175a3421f9e991461de013c5dafd098aae8a7af7c918043280b45c,
      0x19ccb71b6f63f3f29f44140341af6f87a4a81b3248b2c2ef5f8dade51f8cd081
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2e4ff3988b60b139bc50560b4f715fead004f774c8bafda2ddc87b7f6eadced7,
      0x1ae58d1d8884ce7085b5216bdc4ff060e2ad207dafd57a247cee738bafe0d9d3
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x118e4b2301b0faffb122866bcc53a343fc3e926bf5c6317b6cfb577f7c892081,
      0x26c3a25a4807923df8f15c0f79cd412d9a7c2d5d959b37084a990c9af8f3955e
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
    vk.recursive_proof_indices[0] = 98318;
    vk.recursive_proof_indices[1] = 98319;
    vk.recursive_proof_indices[2] = 98320;
    vk.recursive_proof_indices[3] = 98321;
    vk.recursive_proof_indices[4] = 98322;
    vk.recursive_proof_indices[5] = 98323;
    vk.recursive_proof_indices[6] = 98324;
    vk.recursive_proof_indices[7] = 98325;
    vk.recursive_proof_indices[8] = 98326;
    vk.recursive_proof_indices[9] = 98327;
    vk.recursive_proof_indices[10] = 98328;
    vk.recursive_proof_indices[11] = 98329;
    vk.recursive_proof_indices[12] = 98330;
    vk.recursive_proof_indices[13] = 98331;
    vk.recursive_proof_indices[14] = 98332;
    vk.recursive_proof_indices[15] = 98333;
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

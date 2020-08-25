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
        vk.num_inputs = 46;
        vk.work_root = PairingsBn254.new_fr(0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e);
        vk.domain_inverse = PairingsBn254.new_fr(0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041);
        vk.work_root_inverse = PairingsBn254.new_fr(0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396);
        vk.Q1 = PairingsBn254.new_g1(
            0x286cf0c10b27f2e2fdcead6bd61d144f30b789e3c4e65c183ea8947512e35122,
            0x1842152b30d509c6853651f480bddbf628990e33a4cfa9c6c84afad11db1f9de
        );
        vk.Q2 = PairingsBn254.new_g1(
            0x092c075bf55874f92129598fac4c73ed8771d90e02db58be736760f91fe0daa1,
            0x0be4209926cfbef10cd402e0baf2c901e8e4b8786c94866b54d2a36fe466faab
        );
        vk.Q3 = PairingsBn254.new_g1(
            0x1faddf66177b2288d9f5da839af42f561f366bc8311eec82d915b49805ff95e4,
            0x2bc5e594732c884ca1a22932e28d29bd713cc970f3b9de9e3eac3d4bc8e0acd4
        );
        vk.Q4 = PairingsBn254.new_g1(
            0x2e9eb89fe90d4c3966ed6396e9265f10d744942dac707ed9dd1174c39845cb24,
            0x05491515cff4392261594708f9920695c5f8d12eaa471c1bafc20b488138d931
        );
        vk.Q5 = PairingsBn254.new_g1(
            0x02e2acc8e51ec263ea9c07c5c74a807063a9c8dcad47a1940025fe98c8ee3e2f,
            0x17420a2440ae7bac62ec26b9d94f6d0fee42b23e75978107221ec9e459ff1421
        );
        vk.QM = PairingsBn254.new_g1(
            0x2d437f0c415ea407d3b4b765d8c8edfa09d7aef587895171c4bc264c3974a8aa,
            0x0becc501c49c9adf3532b9af5899abf79197596715ded78c36cc05611496f7ce
        );
        vk.QC = PairingsBn254.new_g1(
            0x24174fddb0522b958d55e1e7b1ead86c14966924d2439afd6f14b2093a7aa643,
            0x1527acb68d7286f1f6c4b4f99bf2499eed302acc75184a629b128ebf25fa5889
        );
        vk.QARITH = PairingsBn254.new_g1(
            0x0c98b5e6d80262a25522a90c3cfbb99da567ccd53ecbbef19678efdd6cf43608,
            0x0e491c115c2407f3fa5848f4cb9c9fff5c9ec53c37bb6a4b610770843ec3195c
        );
        vk.QECC = PairingsBn254.new_g1(
            0x08333a2a58c2d1be0eca07f0285043e53f126650bd276e6992b498df7ad837ef,
            0x2b4aea1fe89c8537c921968a81bf2af15d58b5f420c1dd0367162c34996a24d0
        );
        vk.QRANGE = PairingsBn254.new_g1(
            0x2abf9d81b5580ace6afe7c1391766d5d5db3c1578fd712130847f78c7a302b32,
            0x0f16fa9d1ad8ea2938eca3c8356be05f260d6073930acac60f7c32e7045b143a
        );
        vk.QLOGIC = PairingsBn254.new_g1(
            0x0323846f425a432b02481cf18d2ce8e1155dc96434434dc9c6384741f1ce4ab3,
            0x17992a9932773b16a489801130c38519d69c8db65d3ab8e38827b1f81f934415
        );
        vk.sigma_commitments[0] = PairingsBn254.new_g1(
            0x0cf573baead96c1e03c4d1e31211a1decf6f5987634e5cc43390b04c7757bda5,
            0x101a914afb38fcc1bb4bce5e69f27eabe85f17af9f05f2d6150a1c6d6a47e1a8
        );
        vk.sigma_commitments[1] = PairingsBn254.new_g1(
            0x05672312583edc38d689e89572b34b372d3779abec50ac769634e14ad07ce86f,
            0x05224d824ac57c4735624e3ab0c7879f6f7b44613dd723bfa041d25664f7f616
        );
        vk.sigma_commitments[2] = PairingsBn254.new_g1(
            0x28d304069e267f61df43bc43a0f5953050be0e85843412d1bd0eca6c8c19464a,
            0x0a74020e1b3824f3402e3e9fda76228cc5f36ff11edbe96495e0a7834022c40d
        );
        vk.sigma_commitments[3] = PairingsBn254.new_g1(
            0x003e0141d508b80a52ab28c2858ac99c05ce688ce558b3ed43cb9d2b1f9c44e7,
            0x295f213e3023edc397e48921313022a47c21cc4cd110da2c9f824a2940ee3819
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
        vk.g2_x = PairingsBn254.new_g2(
            [
                0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1,
                0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0
            ],
            [
                0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4,
                0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55
            ]
        );
        return vk;
    }
}

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
        vk.num_inputs = 48;
        vk.work_root = PairingsBn254.new_fr(0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523);
        vk.domain_inverse = PairingsBn254.new_fr(0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081);
        vk.work_root_inverse = PairingsBn254.new_fr(0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0);
        vk.Q1 = PairingsBn254.new_g1(
            0x0e211971669f554bc425dc862937c142334d9ccb1a5a29b730429ce1c279c4fa,
            0x278c454f85e5f425411cb4e61144922720a26802fbb1a5cab738e965847d74ea
        );
        vk.Q2 = PairingsBn254.new_g1(
            0x2b0faf56aebbe21c79c46fe36cfdfe078d6f53bcdcd3d7edfdd3e8ca7733fffe,
            0x2e341ec3c33ba626165f3a1ab33309e3088d4e454e9f607ff49280739c85d1c0
        );
        vk.Q3 = PairingsBn254.new_g1(
            0x0c893910e5846d885b64e03d52a5cca8d2bffe2ac41e19dba9b8b512692075bd,
            0x2b963caa16e78e6ef8bfa05e592c0fb1478affb2a6928ee9ec6e8cfda026f3dc
        );
        vk.Q4 = PairingsBn254.new_g1(
            0x208353f15990c552265438f1618cc060ca621bb99f0faf7cec8d9e7d45bd32b8,
            0x1c38e6ab4ace462585247ce3143c48222f0b0e19ec3eedfa184ea2c3b3cb0111
        );
        vk.Q5 = PairingsBn254.new_g1(
            0x117fefe8d969ebde53f4fd9335f87808cf40bda2974a462264da6e690cf3e65b,
            0x00a4bd3e1c5d2f07cf93fe53eb80eec8366d55ccae325fc37118cab1f9edb2a8
        );
        vk.QM = PairingsBn254.new_g1(
            0x24847b26afc9c5d7a0b93cda1c6774d1dbba0dc60c52a26effd64118dd216be6,
            0x03269a54ed264318edc828453311d35ad6e76e435d51548217eb355204edcaa9
        );
        vk.QC = PairingsBn254.new_g1(
            0x2c7617859b4f6c783c4bc236d5b0a347018dc0f8fa6e49b7072bdf7f98e6b800,
            0x2fd9e7b81f01586f40c5a69fd7d7d4d11d4cd4b88b0d895d32d1a8631e7a6f86
        );
        vk.QARITH = PairingsBn254.new_g1(
            0x039092a557f4a76e6f1495137d9dd4349050b76e143b265cd48dc8535077a86a,
            0x1ae47d115e374996c5b9b14b06e20d1e65c4907dbbd1f3182e3faf2687760ca3
        );
        vk.QECC = PairingsBn254.new_g1(
            0x08dc0972c1e17cb97110523a2486b1a83625df0d85eb7aff20a3d2d237cae622,
            0x1640e21a3c9c2da11de1c388a98bb99e7eb8dfdf0a7150a85075e904ce1e92fa
        );
        vk.QRANGE = PairingsBn254.new_g1(
            0x17fad514c7b702d2703839b20eddd1c17499b836041d05478cbc644c653cfbac,
            0x0a6cad8a19a807a0628bba212a03964c52ad76fbd8e4d0415c4dfc5589ac1f8e
        );
        vk.QLOGIC = PairingsBn254.new_g1(
            0x2a17c26c47d21be090ab8abb0c9dd45e7ffb2356b69d3f6db02b31cda81c5b62,
            0x099da99672f5607b6ff0aea82d3ca23c90d979f2282df75183f76eb2601acdd3
        );
        vk.sigma_commitments[0] = PairingsBn254.new_g1(
            0x21d95026a3c2fda31d88f457f2b87eb314fa2c113a4c29b8fe9e67381ca3a962,
            0x036780e7d83df73c8b7675be272148c20b873b05e3daae53e078efb7da9ec376
        );
        vk.sigma_commitments[1] = PairingsBn254.new_g1(
            0x191c565cafb4d687a6098466aba72c9202247ed542477f5a669949e85be45c21,
            0x17b4b2541537d04f27735449b66baf330d29236f6bda3fcdce32f707a2584636
        );
        vk.sigma_commitments[2] = PairingsBn254.new_g1(
            0x0a45edefb384fac0fce40eba141126d2a6c5020f20b2a0d3632adf35ad211ecb,
            0x2fa64dd45f08b99afb74d091cd0d26b4d3915a0f98e77936c39112776fa0f952
        );
        vk.sigma_commitments[3] = PairingsBn254.new_g1(
            0x2cc8e3e9a9a2c2ae2c250199ec6bafcdd79ea3b474a0eb7c77f2bcc2a3fd3a89,
            0x0363d4a8c014b62d07ed9acc47df41ce8199ce824bcd7ede4489b3d902d28ff1
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

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1Vk {
    using PairingsBn254 for Types.G1Point;
    using PairingsBn254 for Types.G2Point;
    using PairingsBn254 for Types.Fr;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        vk.circuit_size = 2097152;
        vk.num_inputs = 36;
        vk.work_root = PairingsBn254.new_fr(0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523);
        vk.domain_inverse = PairingsBn254.new_fr(0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081);
        vk.work_root_inverse = PairingsBn254.new_fr(0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0);
        vk.Q1 = PairingsBn254.new_g1(
            0x0bc81284dcc00c320e073548fe1e80e03d5bb86b91fcf5b9884a93a23b9ee98b,
            0x21ca8782d23e7b03471c2612aaac887b22192004a12fff556635c3c0581b6c63
        );
        vk.Q2 = PairingsBn254.new_g1(
            0x2eb519a4a18264e927917457a4f4ed3fa2e3c4907c278b4238a13a10b7be13aa,
            0x07654229d014666dc116c1082ddaff97ff487c1c4a62a7dcbd29822de5d5c033
        );
        vk.Q3 = PairingsBn254.new_g1(
            0x150e08cb4dd8b9796ea3fd49045f213394cccbf41f9ddb4d6d86747aa906c7bf,
            0x104421989e033686d5a9e6d330f08bbb2ceab3f63f08b94448148f03b643352a
        );
        vk.Q4 = PairingsBn254.new_g1(
            0x066b33d5b54203c38d2914a016252ff90ca4ac30563f61c1a4605bc7ee2b93f4,
            0x11ae0fc9143b419d49292ac2b0d2cd537f3a38177251743dd2fb6fe3828a8b8f
        );
        vk.Q5 = PairingsBn254.new_g1(
            0x2089f7cf52734fe69e65720b3257370fab5a993be4d924242d2b3ad00acf5fa7,
            0x10b4309c3e1650095c7620739bbb456df64e26c4051faf9b97bef2cf8dadbffc
        );
        vk.QM = PairingsBn254.new_g1(
            0x2271564b65384e54ad13cd5999116cdfd539b3eaa40247e3989247a79e25c3b9,
            0x2aa1566d55cca0d9d7a9768535e6d64676b4aefdc5aed3c4c71505ee4771d6dc
        );
        vk.QC = PairingsBn254.new_g1(
            0x0c035c89f9691724957235af13a4b36fd736d185075eb3053705db4947ac6c1e,
            0x021b40cfdbbc1a797f8699f71bd70fb3b36f7c803c516fbda1e3e0ddb03de585
        );
        vk.QARITH = PairingsBn254.new_g1(
            0x292a4e2fef44feaf868fdfffb73a9218227d0628f1bc3b651d26e58f0847b561,
            0x1e1c8dba317f9df91b68dc7c282f1f98af59d416bde9d0607e99be3eb2800a5c
        );
        vk.QECC = PairingsBn254.new_g1(
            0x0b946c5af3783078578049f0ea85b34e10842dd1a16552ac43153b43e51d4841,
            0x2a39242f4f5930d6bb2c7f90a9597ac75b6d722445fe6f4dfa152c4793da6775
        );
        vk.QRANGE = PairingsBn254.new_g1(
            0x2101b7f1caf1a0de7e85faeb9161f86a33250ddcdb867d63d210b755cc62e817,
            0x21b718dd2954868f291b06385343ca52f6a3dec0b1f19d0ce183bfa0d197f419
        );
        vk.QLOGIC = PairingsBn254.new_g1(
            0x2395b30d3bf3e0c965d1d151914f46cb64820c44c524e455da69748d46e70b74,
            0x0fac6b097bf30005abb6961c2768c7a675504bbcc3b64ab555099a5346558abb
        );
        vk.sigma_commitments[0] = PairingsBn254.new_g1(
            0x1b63779832473cdcf01a8576e210ccbcb982f8487ec91ea0dd249ddee8ca969c,
            0x25536c4bafa7038bdffa3624f5f18dcd86734cea89f126963bc0846e96128d0a
        );
        vk.sigma_commitments[1] = PairingsBn254.new_g1(
            0x26a09185d9eb19719a9eb53cef923db60601f6a77a06e6b3346fcb313009a68d,
            0x15ff67386b53ad7145c665b8b6f5570f2d3faa266216508e62745910f726d5ad
        );
        vk.sigma_commitments[2] = PairingsBn254.new_g1(
            0x2c0a48839b87494664db18b462277cc3ea7f53574e0752170ef6d8020841be4b,
            0x12d83cf528fca73fba840dd3cfc86f64c11d6c9ce55980cc58e5d012339dfd2e
        );
        vk.sigma_commitments[3] = PairingsBn254.new_g1(
            0x2fbf002e4b1cdf8fb5533cd3cde14a1b0a6daad4db89c0cc57f8cb1dfeaf98a2,
            0x0fe809fe328e5321d8002bd83f975a9b7d37a3ed21c3a86dd32140f4d4f8b057
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

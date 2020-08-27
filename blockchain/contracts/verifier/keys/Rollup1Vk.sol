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
        vk.num_inputs = 37;
        vk.work_root = PairingsBn254.new_fr(0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523);
        vk.domain_inverse = PairingsBn254.new_fr(0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081);
        vk.work_root_inverse = PairingsBn254.new_fr(0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0);
        vk.Q1 = PairingsBn254.new_g1(
            0x1ef8ed03e037dc2df9fa1feaeb995cdf3a9369d2df41a8e23c7f40314b79f578,
            0x2ce6c79ca4575fcb7531791b7d4d5c4704d568d917ec9b104dd8e5fd7bf4a77e
        );
        vk.Q2 = PairingsBn254.new_g1(
            0x06519af2cf25979405a80dc36d938b80482d107572c9b822bcd531fc05965c03,
            0x24d8f8d02bdd138e7738fc191afcf75a60281d869f2711ec69085cf9dac1e74f
        );
        vk.Q3 = PairingsBn254.new_g1(
            0x20b4a22f01bc21c3a544dc7c422fb81e20e4960ca82ecdebb21987ee76342fa2,
            0x2b8964a37c2bbda1423a62d44939b6ad21df7ca10f9f5e5d3e304d6b6628908b
        );
        vk.Q4 = PairingsBn254.new_g1(
            0x03d7250a222cafbbe80428809c18d796b1a3f6cf36a0f91eb6b1635936f1d3e2,
            0x026db55e434d6320a4b65cf504b9f7ae832d6dcfd577b9703d9c6c06a8f4e2ee
        );
        vk.Q5 = PairingsBn254.new_g1(
            0x2f683c265ca1df533d8b1d5d7519fbe6a99db178572bf53f8a0822f6422394f6,
            0x0af21cd9a80df6966f296cd8e1392fc83af5bb19fdc847c8a709ae2902b3e721
        );
        vk.QM = PairingsBn254.new_g1(
            0x2a4a17716d7a31bc8d9c0023fc957c2aa718bd529128242899e06c6f0dfafa86,
            0x06e5b56b465bb9de8842c448c5b73a9dc3c163e1a0a423a807bdb7fd5b227096
        );
        vk.QC = PairingsBn254.new_g1(
            0x108e0765cdacfed6152a0c2b4f62d161fbe4ac1b15c67ddd339ade4b784e0785,
            0x2ab3c21757c75eb9afee409123a4aeff9bf6def82bc29cde96a3a9fc5d99e4e5
        );
        vk.QARITH = PairingsBn254.new_g1(
            0x018e0aa708851270b2130f6b058f39f139d6a5c404685241eb7b0e4a14e87565,
            0x0ed56e0f1bf80ac42d354e2be4975a0079cfe40fa8618ec19f1dddc79b92bed4
        );
        vk.QECC = PairingsBn254.new_g1(
            0x094a77bd8fed1c0be3213efe0c7afca23687bbb897550d30e2dbbab44d50ea6a,
            0x097363056aefd6b916f2776fbde2dd9c689998299548d20f60917e030c1571dd
        );
        vk.QRANGE = PairingsBn254.new_g1(
            0x14e85e66b3fc3f64a26ba4846960706721cd1b79687509d5e22251abf39b0f88,
            0x262939439a9438f920494084576ac516f30576c4b2350991a4b2136882059c2d
        );
        vk.QLOGIC = PairingsBn254.new_g1(
            0x2800dfa62863b3274730ad2ee26862b2dea55925b211cb2b7bb6ab52a8186cc0,
            0x2206f81fdda7bf6e55423f1b61dd0c4e793479416362b154f5cb1ddad35c7b62
        );
        vk.sigma_commitments[0] = PairingsBn254.new_g1(
            0x120384bab31f4e090dd2182126805bb2e9c84fa6026f05d9d77fef0e42559fa0,
            0x0ec12d4c45495ce6dd9956d22a3a019e9d2c4626ca5ab5cefa4ac3a4b4c3e981
        );
        vk.sigma_commitments[1] = PairingsBn254.new_g1(
            0x1ad8531313902651444cca10355c0d7e321279369ecb1a71ddbc9976437bee05,
            0x0f2a096116f4befa33219587100f68071a8c682ca03b393258828130aa2fb1bd
        );
        vk.sigma_commitments[2] = PairingsBn254.new_g1(
            0x1f82e8cb0b5782654559bb37569c278ce028b6e8feb25161d0001b9e1d5a9734,
            0x1ed612c613f4dcd6037b96d3410a3386abc6035ae977aa06bd1c805c588873fd
        );
        vk.sigma_commitments[3] = PairingsBn254.new_g1(
            0x07547f54c9d01eb9ec7643b6b43c7a4e6ee745254dec70980a026e09d1963da5,
            0x0ccba13333f4c4c25b19cf8c5aa44521876468c66290dda17729b1f689e04713
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

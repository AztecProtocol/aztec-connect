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
        vk.num_inputs = 27;
        vk.work_root = PairingsBn254.new_fr(0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523);
        vk.domain_inverse = PairingsBn254.new_fr(0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081);
        vk.work_root_inverse = PairingsBn254.new_fr(0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0);
        vk.Q1 = PairingsBn254.new_g1(
            0x23705e4b1c577347883938c00f9dd1e38e1f3be21510d2bdded3549eb2d8078b,
            0x2176bf2e25b963dec46ba5af6e6029c1cb891be0458bca03db3a270548ec26ec
        );
        vk.Q2 = PairingsBn254.new_g1(
            0x2c5c14c5a531864301dc5f3135e4edef51cc14ed70eeed4e4c7a44a208bb398f,
            0x09eb5fc7821d7bb6829bc718f06a5d0f2c5fadc77047b4e4ca84dcfa82bf50a8
        );
        vk.Q3 = PairingsBn254.new_g1(
            0x1eb67f7a7a7d62102c310654cd4dce565c5ce6c93f77ef3ccb63e2ccf9119675,
            0x297e209ad34e8f10dbd918c399b408a6d34c4c4be3acf17f43e9fb9be2f51269
        );
        vk.Q4 = PairingsBn254.new_g1(
            0x140b33e2841e371e210351cdd2e47665bd8156fb13f3c2c6ce402aedcfcad0d8,
            0x09767e4e73b921740687fe5816624f1a3a396a5e8c9ba81f9feabe23733a48b6
        );
        vk.Q5 = PairingsBn254.new_g1(
            0x2850eac03d2232a34967fafbf43338b18ab2b19724a6164bede60b4e1491a195,
            0x181d85eaa74feee768b77ef24be5b89d24c986ff8e93e2be35d509736d7d86fd
        );
        vk.QM = PairingsBn254.new_g1(
            0x04f2d6f96f1e6dbb5eb6abeb2d44a486082617cae0bd13ffbf1bfe779b71dcd5,
            0x1281152547619cdc972bcf96a28f96ee7f4427ee4f8519ccee3499ed0a9b5c67
        );
        vk.QC = PairingsBn254.new_g1(
            0x2829f9d8bfb0970cfa4f5c6641412fdd7a89b23cf9e14c21ccf212d7fa55d8f7,
            0x006a11f3e6e05b7ce1a2414f2cc7a63f8d2423e47f517fd0e562cafe155ea2fb
        );
        vk.QARITH = PairingsBn254.new_g1(
            0x2bc1c2886a831a673141fa432841929c3a57ae81b0956f449f3f34f4927f1402,
            0x23d6dbbe684bbecff95f278745749f56f114384b0774ef8dbc73d1f029785151
        );
        vk.QECC = PairingsBn254.new_g1(
            0x10b1fec1ab6ee302d8a17b4ad2a24253daec3a6401dc4100bae9cb9a88e82b5d,
            0x1b04d48b599324d1cf7eaeff451816dec3339658991b4435c07b8d1661192bee
        );
        vk.QRANGE = PairingsBn254.new_g1(
            0x2a3ba6a2662ca5672a6376ac2af0a6bff426e8f4262c35322cc04b784dd22712,
            0x0dbbd6db1c2d298434724c09d70d4f0f6c83ea6920478f9ebc82f3db918cb04d
        );
        vk.QLOGIC = PairingsBn254.new_g1(
            0x0c2c752c7de866486156461e170040d2ae4b28efb6fb05a1b162812fca88ea55,
            0x12fc898ca74258f833dd24a0bf01d3995a691ea592a5348a0a174d5646e1004a
        );
        vk.sigma_commitments[0] = PairingsBn254.new_g1(
            0x051e37573832b51829b0e3d49943c84ec698ff8bb02bf208a8456cda2a56f26c,
            0x08812ccbb18df0a1607c29a80e4b345e006aaf34c7087c688ef2ba2d3d7c34f2
        );
        vk.sigma_commitments[1] = PairingsBn254.new_g1(
            0x1d8fc700258e38e3e0874c33722f2ceeb28cef61c681ffb2e87e8d04fdad5b76,
            0x198c29974a5d6b0781c75ed220f94677ae95c4edaceb363acb74ce24f4beebc4
        );
        vk.sigma_commitments[2] = PairingsBn254.new_g1(
            0x07b9d9ce202a2f637089c84b1af03d0eb4fdec8d85572732f1378e836b8915bb,
            0x0ac41542ec930b6d2fece9a9f2ba858b960175c43d0628a5f9790404d2c7a5e9
        );
        vk.sigma_commitments[3] = PairingsBn254.new_g1(
            0x1b598453aa100e01e38c90a2003cc4cd3bceb8ba290d4500b7a2e111e581b40a,
            0x19b93a0c789be8051c781cbb932f967f12a92f2cf85fb2cfaa6efeb6b52f8422
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

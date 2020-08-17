// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {PairingsBn254} from '../cryptography/PairingsBn254.sol';
import {Types} from '../cryptography/Types.sol';

/**
* @title Rollup1VK
* @dev Verification key used to validate a rollup of size 1 - a rollup with 1 transaction
 */
library Rollup1Vk {
    using PairingsBn254 for Types.G1Point;
    using PairingsBn254 for Types.G2Point;
    using PairingsBn254 for Types.Fr;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        vk.circuit_size = 1048576;
        vk.num_inputs = 18;
        vk.work_root = PairingsBn254.new_fr(0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857);
        vk.domain_inverse = PairingsBn254.new_fr(0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101);
        vk.work_root_inverse = PairingsBn254.new_fr(0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3);
        vk.Q1 = PairingsBn254.new_g1(
            0x278fcfa9ecb74e1d59aa2e21edb61d49f5185601170c1c8a76bafe73533b1e00,
            0x150f2dce262b179c112b103277b6399df1e99b3848c204caa623dde99add7006
        );
        vk.Q2 = PairingsBn254.new_g1(
            0x01c37715ae8848f41fcb65980ba55aa401f8f10360f2924f80cbd17a022d80ff,
            0x205b24ddb354156b0b67b553a4636fbf0888716a91e8a3034eb657a120133f03
        );
        vk.Q3 = PairingsBn254.new_g1(
            0x1fe48ef33f932700188d4f42345c4b8202fd7b5a69ad9b61120a44f1f0b7ae25,
            0x29afb323173b51401c6a3e175b7ef1b46203f22f75b407c1a56538ae9378b722
        );
        vk.Q4 = PairingsBn254.new_g1(
            0x12b49e2294b39f41136168b709ebbeb741d384221382dfac4daef411f6c08269,
            0x0de0e437b7ba6a60a7b43afa5d46d665e5dcd241dbcd9f97f2054f88fd48e4ed
        );
        vk.Q5 = PairingsBn254.new_g1(
            0x2f937e5f7298720ac6c9bf19bfe9eacbf4302c5dc0a866da997453b1f820c144,
            0x1af3bcae4d7c1fb8360b453305658f0e2e7b63373538e32c721ea75f4ce80838
        );
        vk.QM = PairingsBn254.new_g1(
            0x22cbcc9cbe0bb17304743b884f113735d0f8f28341ae416d46bf829eb879ac8e,
            0x062c1fcbac0d861d094deb7168b265a1d738297845867259b76cd85276172921
        );
        vk.QC = PairingsBn254.new_g1(
            0x0b8b4acf47b74f28671c371ea75d05a836e6ba595c49be3fe619e5c9cd709e8c,
            0x005d8d61f046db194fd2a9869558e4b53c32422156f26c20e30ef5724aa847ce
        );
        vk.QARITH = PairingsBn254.new_g1(
            0x067937ac4c3dac106357bdbf334a5d7907ccb6cc43210428eddcc02ebc3c297e,
            0x24f35665698666c860e91a3f76e390ad3dcaf7df42b5b921e8e04ae296cf1067
        );
        vk.QECC = PairingsBn254.new_g1(
            0x064fb874c9e7a886f4d94ca6379a386503ac44490823c476c7c97cdba8be1de2,
            0x3041306dcef231a023899597cd81a8c3e6aaa1288ad06067069a0000f1590fe4
        );
        vk.QRANGE = PairingsBn254.new_g1(
            0x153bbf1674e35016e1f2436b76d85c140f75059a238878fa0e18294dc5f9936a,
            0x08e0e92d818946f3122e3729b16ab6d8c31c710e5fef102b17e53487eeeba354
        );
        vk.QLOGIC = PairingsBn254.new_g1(
            0x0084d13309aa6181c45a6de013ea9ca30804dd4080cd909ef0675a4e09d58abe,
            0x0ba6bcba36df4d6f96c0a99299cff482a36c758540546b07a34f114916bb1c5e
        );
        vk.sigma_commitments[0] = PairingsBn254.new_g1(
            0x071866d2b80282884a6a90716a5ce296eed40f149d0562161c8964455f6fbf21,
            0x092a663c51286d9684440a6c347159e0bdca53e39aa9bd03844aa3f461fdf51c
        );
        vk.sigma_commitments[1] = PairingsBn254.new_g1(
            0x01c75e03b22acd143529368f09475b9a47e3957e544b1b0769f4fec364dd9d65,
            0x19e3f69ec848a3cf8dbefd32b5080da61ef6b23b09333d668f1211716bd34337
        );
        vk.sigma_commitments[2] = PairingsBn254.new_g1(
            0x2cd4491662e04bc518b08f5741a196a6987a2e496f0a3966d42e14ba93ec7a33,
            0x2adb2d6c5e3fe6c12b4e1437ac9fbe61b0ccc6739f91ea5ee7b11511b151837b
        );
        vk.sigma_commitments[3] = PairingsBn254.new_g1(
            0x0821d6ea98a22bc5142a1248c50fed32cd081969b7332863e2eb41995cd00fc4,
            0x24664195852ac09261d06099a1266d8c966807bf415527a05ffb824cc653b5a2
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

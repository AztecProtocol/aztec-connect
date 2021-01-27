// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1x1Vk {
    using PairingsBn254 for Types.G1Point;
    using PairingsBn254 for Types.G2Point;
    using PairingsBn254 for Types.Fr;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        vk.circuit_size = 1048576;
        vk.num_inputs = 42;
        vk.work_root = PairingsBn254.new_fr(0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857);
        vk.domain_inverse = PairingsBn254.new_fr(0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101);
        vk.work_root_inverse = PairingsBn254.new_fr(0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3);
        vk.Q1 = PairingsBn254.new_g1(
            0x099194163c550d7c8d5e1e1feee3149c5cbc6bfbaea7416b07515a8607587fe3,
            0x268e825805edcb363abf8efaf6edc14109b706dfb3126673c72de70593874753
        );
        vk.Q2 = PairingsBn254.new_g1(
            0x1a84a7f01f42b60e92311a40e0879ac5898807c211b541720b3071043f8a26d1,
            0x21733eedd0d6bbe74f79e8b728b211610776e75bd23dfbe0a35e9bd7ca1eb111
        );
        vk.Q3 = PairingsBn254.new_g1(
            0x058d2ad96ae78fc327d2d7bde393fb79ce7742d2a7c6ddab3a0b7c0a69ee9df8,
            0x0afa953b470dd6e4a54a4d99479b2d217eae2698186995809d791a0acc705c6e
        );
        vk.Q4 = PairingsBn254.new_g1(
            0x0cd955e915b07cb230cf7d4886be4f8f72367f98c0a694fc63c7333297103264,
            0x114a54c76f958d38f9ec082b34977713e60a5dba1c34da94eaaf5f9d5061dc9b
        );
        vk.Q5 = PairingsBn254.new_g1(
            0x1bc5d6ce77315e3c1dc23945d94ebdaef4083f231ae4f9095314bd7b38b85424,
            0x0d32293f33c4e4df2411dc772d7666f2ea2af813d1fe5ba683c84e6ab3261c3c
        );
        vk.QM = PairingsBn254.new_g1(
            0x1e83c90ce5f94c6e4eaec974300e4b417ee3f257dd3230ed0599e7958a8ddb59,
            0x102c576b75dc6f56d2ecec3b38c8263625f24146df202a9ecd2bbe256ef70c5b
        );
        vk.QC = PairingsBn254.new_g1(
            0x0c29e38555643aedc501ef1c6fae720f51ea480a95029141846ba965f96be345,
            0x0b2502ecc021167903f9202c4e5a3a8345c9176a86747e4b0bd354f2bcbbf1e9
        );
        vk.QARITH = PairingsBn254.new_g1(
            0x04d1a6b766fb03e40a92e7ee52435146ef367a44af4548bb573d69d14ac1dc04,
            0x0a50d29fa71cdf5caf9780d7d90baff3ac3d208023b634c87247b1bd3fcbdc98
        );
        vk.QECC = PairingsBn254.new_g1(
            0x035d65e63f0f5d65af58f54283d54517698b62a9eb6f97d24a5ecb6d2aaef4bf,
            0x1704b058b8867cfe2b24411b0a98472d64f479280d9de0bbe8d01a38e59a2a1e
        );
        vk.QRANGE = PairingsBn254.new_g1(
            0x2c75191104b195b3898216fbef70e7699dc57c23d998a28790a883875bcd4b87,
            0x188efdb9601963bb6483814778b7f494a9759ec64ab3e7cc80a02b60cdbdd1a0
        );
        vk.QLOGIC = PairingsBn254.new_g1(
            0x25360955ff3fd4ff053f2f8e6cc363596ec3edf4c8ee6bf1460bb39194ec3a8d,
            0x2cb830c4b0989093d840bd0b7332cd9b054289b9344218fc2b7a1c1741efe965
        );
        vk.sigma_commitments[0] = PairingsBn254.new_g1(
            0x10c1cc2193880a1b8823da67052e926770d4d98ea10caec75b7ddefe60db1d3c,
            0x13fe1d19280835eab52d73ce9f656021c3c751675db3989ea21b101fa60242c0
        );
        vk.sigma_commitments[1] = PairingsBn254.new_g1(
            0x01c5f587e87ff2916f1daeea280b6138000144b0fc780529eea4bb32cb2bedf8,
            0x151099ea23f744338ee30a85024a2ecdc79fa422b86ced998486bbde53d7cb14
        );
        vk.sigma_commitments[2] = PairingsBn254.new_g1(
            0x164fc620b8a057cd3d3bd2e4a8fa3cc4825ec7942fdcf3ef7c5102713b393655,
            0x0a34dc9cf41e78fa0474d5d33ba70683cb48739d118244c86b1d8f49d443f447
        );
        vk.sigma_commitments[3] = PairingsBn254.new_g1(
            0x0b3026d338cf132ecb26506c0039e4c014993f79ac42a6aaa739a86e4cb91bd6,
            0x11841a53e649053aac1f1b848c2e93f3a877712168127dcecc1073d663c703a0
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
        vk.recursive_proof_indices[0] = 26;
        vk.recursive_proof_indices[1] = 27;
        vk.recursive_proof_indices[2] = 28;
        vk.recursive_proof_indices[3] = 29;
        vk.recursive_proof_indices[4] = 30;
        vk.recursive_proof_indices[5] = 31;
        vk.recursive_proof_indices[6] = 32;
        vk.recursive_proof_indices[7] = 33;
        vk.recursive_proof_indices[8] = 34;
        vk.recursive_proof_indices[9] = 35;
        vk.recursive_proof_indices[10] = 36;
        vk.recursive_proof_indices[11] = 37;
        vk.recursive_proof_indices[12] = 38;
        vk.recursive_proof_indices[13] = 39;
        vk.recursive_proof_indices[14] = 40;
        vk.recursive_proof_indices[15] = 41;
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

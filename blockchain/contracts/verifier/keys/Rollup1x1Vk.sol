// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 42) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x203bd0f897802b3e260eb46829df30bff8321fc1877ff373a17d1ba324b22cd5)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x28b13b38988e513632b856ff030e6a3362dc4bef91c348f123a2e737470593b3)
            mstore(mload(add(vk, 0xc0)), 0x20245b5b3783acb959d2ff79f239067b021ec3b7838f97b5302fedde63b335a6)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1e49addb9d01d9745bea8270befc5688c3d6316dd11afef8e4056faa632e35d0)
            mstore(mload(add(vk, 0xe0)), 0x058d2ad96ae78fc327d2d7bde393fb79ce7742d2a7c6ddab3a0b7c0a69ee9df8)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0afa953b470dd6e4a54a4d99479b2d217eae2698186995809d791a0acc705c6e)
            mstore(mload(add(vk, 0x100)), 0x0cd955e915b07cb230cf7d4886be4f8f72367f98c0a694fc63c7333297103264)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x114a54c76f958d38f9ec082b34977713e60a5dba1c34da94eaaf5f9d5061dc9b)
            mstore(mload(add(vk, 0x120)), 0x1bc5d6ce77315e3c1dc23945d94ebdaef4083f231ae4f9095314bd7b38b85424)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0d32293f33c4e4df2411dc772d7666f2ea2af813d1fe5ba683c84e6ab3261c3c)
            mstore(mload(add(vk, 0x140)), 0x1e83c90ce5f94c6e4eaec974300e4b417ee3f257dd3230ed0599e7958a8ddb59)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x102c576b75dc6f56d2ecec3b38c8263625f24146df202a9ecd2bbe256ef70c5b)
            mstore(mload(add(vk, 0x160)), 0x0ed4a31044247879e691d48a1bb1eecc17c23668f5632e8a490a37609f4de396)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0814bcc85a02edf0621c0bbc9c6269bcb801d2440b7ea975c8d337f997838162)
            mstore(mload(add(vk, 0x180)), 0x04d1a6b766fb03e40a92e7ee52435146ef367a44af4548bb573d69d14ac1dc04)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0a50d29fa71cdf5caf9780d7d90baff3ac3d208023b634c87247b1bd3fcbdc98)
            mstore(mload(add(vk, 0x1a0)), 0x035d65e63f0f5d65af58f54283d54517698b62a9eb6f97d24a5ecb6d2aaef4bf)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1704b058b8867cfe2b24411b0a98472d64f479280d9de0bbe8d01a38e59a2a1e)
            mstore(mload(add(vk, 0x1c0)), 0x2c75191104b195b3898216fbef70e7699dc57c23d998a28790a883875bcd4b87)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x188efdb9601963bb6483814778b7f494a9759ec64ab3e7cc80a02b60cdbdd1a0)
            mstore(mload(add(vk, 0x1e0)), 0x25360955ff3fd4ff053f2f8e6cc363596ec3edf4c8ee6bf1460bb39194ec3a8d)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2cb830c4b0989093d840bd0b7332cd9b054289b9344218fc2b7a1c1741efe965)
            mstore(mload(add(vk, 0x200)), 0x10c1cc2193880a1b8823da67052e926770d4d98ea10caec75b7ddefe60db1d3c)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x13fe1d19280835eab52d73ce9f656021c3c751675db3989ea21b101fa60242c0)
            mstore(mload(add(vk, 0x220)), 0x10bdae0660ccb52cee76aaf9264048e2ed0a143cc946b98a6f72c04279228dd7)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1cb2275dff734fa3647220d31abd52fb27e3b5174a8e2f06f8facf3e3cc9c8cb)
            mstore(mload(add(vk, 0x240)), 0x1cf266290e2d6dadecb66d8a0b8c00c10c8fb1f6a39d465fe235c2f8f96825e8)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x16b39ae14c6add4e14d9a76a684c84529096c5b842c678f30428ce69459f3491)
            mstore(mload(add(vk, 0x260)), 0x26ece0fbf28d9beb13cde905cf1193306145f1669b6502bf0fef09bb911c2ee2)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2a14826608a3683323b36e3d6e96082197220178022edce202f99c2c89a1d2eb)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 26) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

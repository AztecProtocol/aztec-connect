// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library EscapeHatchVk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 524288) // vk.circuit_size
            mstore(add(vk, 0x20), 26) // vk.num_inputs
            mstore(add(vk, 0x40),0x2260e724844bca5251829353968e4915305258418357473a5c1d597f613f6cbd) // vk.work_root
            mstore(add(vk, 0x60),0x3064486657634403844b0eac78ca882cfd284341fcb0615a15cfcd17b14d8201) // vk.domain_inverse
            mstore(add(vk, 0x80),0x06e402c0a314fb67a15cf806664ae1b722dbc0efe66e6c81d98f9924ca535321) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0100e1bd357df22d8df0f0ad9e66143e06044d3dac195eb29e0a798199d58d5c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x18fef4880eb45b0aac3e2f8e1882c95cf90015b1c9defd9c30fc7ba253cf51e6)
            mstore(mload(add(vk, 0xc0)), 0x122ad9b5539eede8b6a47e47ae9c61b45f270aea77e627cfe99dc21ed894abfc)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x07a468837e12c76e2310e1c326a16b9a0ae3236a6e987f855987621b5e682586)
            mstore(mload(add(vk, 0xe0)), 0x00760be6e08109fd3c394b213aab84b5a13a9cf3f6eff43f0a4b70763654442c)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0c8f4c21778e08764169d52e40b7f0e699d9aef063d3c68182174abef2723703)
            mstore(mload(add(vk, 0x100)), 0x178fa18606234b19a371e9d52f4cedb6a4d5efeba759b08340933dc5b19a27ac)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2cdfbec350234ec88972afa32f87d3e8f0ee248aa267891ead3d2b032d82d162)
            mstore(mload(add(vk, 0x120)), 0x2834f7029e10fa57260d7f2d42a77f5fe24caf451575602e4e7fba3e16dff66c)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x150f06593c6aad1b7425c49a6742ea52a94b8f0d3f41d8ea5c597869d591063c)
            mstore(mload(add(vk, 0x140)), 0x05a62c6673f2162b27ee8bfdcdb802604119afaf2d6f91102532d4936012cc98)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x26bcf0ba1524c97d887bd0cfa8b4265556a2cd1048e6e93853b466127552ef19)
            mstore(mload(add(vk, 0x160)), 0x094a46175a98e8996bc7af5ba26610ffe78171eca4917ebba0d341bf33dd002a)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2969882eacabd748daf7e370378e4c95453fa7d819e89b6426bc42d7e8d1c002)
            mstore(mload(add(vk, 0x180)), 0x2204a46b1faedf97ad0279c69dabc7442f4b817ebf61c54082fc62aff030e280)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x091927d3d2929025ba5e598f5701a81e9c962595fc5c3a21acf6c656d9e259b3)
            mstore(mload(add(vk, 0x1a0)), 0x2585b0ac291c681014b3fb5732533ff5b76acd22a8509c16354d2ef33a14df4e)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2ef8531698b4743620461e4d1d01ae4228d8cac66f5565c878f8bf05abe55222)
            mstore(mload(add(vk, 0x1c0)), 0x2e78c87bbe320589e489b1b85739d47d1e82ef8a70e76f40c0d9c5871e683380)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1cf230dd2e772c2e097421258ca580e240d76943f3749e5ba60a6140e73da8af)
            mstore(mload(add(vk, 0x1e0)), 0x032fc9090576f5bc8784c042bf56342267d5dd6a3d62929d869e868eb9dc0f19)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x11fd80af2567718b09610f1bf8c4d515288067c3288e2346455faa7d8654c2f6)
            mstore(mload(add(vk, 0x200)), 0x101d3bb69fbc0ae083b63dd64ed14dd56c6f86cce0db71bcb037ab22d7825516)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1a47d9eeb70530f9e4c7699abd898d31d901f46992afc324b402dd525673e5fd)
            mstore(mload(add(vk, 0x220)), 0x024fd557021e4d11a86f618c682b7544f6a1aa30a37a6b2f08fb362bc47b9b11)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x240f9df5ba95353fad31329296dddcba83f3e8c0f65591e1a228531322cfb257)
            mstore(mload(add(vk, 0x240)), 0x044a0e73dab946aee3682287c6a513e234fdaf560432744695eff3a474f034de)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2ab3fd1c934c8c732206b6dddf37c14c2fd5e4544d840389d07734249ea0dcac)
            mstore(mload(add(vk, 0x260)), 0x013ab166afcf087098b189be6f6f66bb301715c597baf72a715025e259259642)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0797f59ce40f81b83323a8fdc474bcbdf0aebc43d3d4fbadcb947017d2939ce0)
            mstore(add(vk, 0x280), 0x00) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 0) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

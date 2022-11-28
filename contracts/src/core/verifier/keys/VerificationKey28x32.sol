// Verification Key Hash: 8bb8dcfd02060143443271408d47991c82c9fd631b02b42ef1ec28909631b9a1
// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

library VerificationKey28x32 {
    function verificationKeyHash() internal pure returns (bytes32) {
        return 0x8bb8dcfd02060143443271408d47991c82c9fd631b02b42ef1ec28909631b9a1;
    }

    function loadVerificationKey(uint256 _vk, uint256 _omegaInverseLoc) internal pure {
        assembly {
            mstore(add(_vk, 0x00), 0x0000000000000000000000000000000000000000000000000000000000800000) // vk.circuit_size
            mstore(add(_vk, 0x20), 0x0000000000000000000000000000000000000000000000000000000000000011) // vk.num_inputs
            mstore(add(_vk, 0x40), 0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d) // vk.work_root
            mstore(add(_vk, 0x60), 0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821) // vk.domain_inverse
            mstore(add(_vk, 0x80), 0x1d349b8977724e09c86fa578f4735879a9f44c213b0c8ca5102e4c3971408ef1) // vk.Q1.x
            mstore(add(_vk, 0xa0), 0x24f288f17b6ae11b4b7864ab9594f8b2f4f19ea1d60e17f772974e91844ac462) // vk.Q1.y
            mstore(add(_vk, 0xc0), 0x0f497062b02badba76b0dcaaab298d98be8065f2c12a0d016722cd4c128fcb6e) // vk.Q2.x
            mstore(add(_vk, 0xe0), 0x0c35a5c01f13a779a561ee38425a227edbccbb249cbab8b3c67acb6ae4fc1e8f) // vk.Q2.y
            mstore(add(_vk, 0x100), 0x1da0feb3b521b13e4c0f131fb7e5fe4a4406caa1cee0df757659f2303329c00c) // vk.Q3.x
            mstore(add(_vk, 0x120), 0x1f964f3a14e19de343a7a8a7ae0fc7b3c44211a9927ebbdb9556fd623177464c) // vk.Q3.y
            mstore(add(_vk, 0x140), 0x188fa91323b2ba20000d98efb311dc84b27ec60203c6f51301471213bfcc0c93) // vk.QM.x
            mstore(add(_vk, 0x160), 0x0dec5cadfc71c9c707e8d451f6a87ee63a25769d6ca4b35f84596bc8d163ab13) // vk.QM.y
            mstore(add(_vk, 0x180), 0x0e18198690edc77d449e2a46b5bffffd1356422c0fa54e3cc011194ba83eb6ed) // vk.QC.x
            mstore(add(_vk, 0x1a0), 0x1f22be590007dbcd8ce6d51b513bccb91906f3baec495226810856655b7fde35) // vk.QC.y
            mstore(add(_vk, 0x1c0), 0x1ae57998807b3d1393feec54458002a457f5518b9adc66bb2facf68fd08e6c85) // vk.SIGMA1.x
            mstore(add(_vk, 0x1e0), 0x078c0f28b8823d267717a4b9903af394feb40e305acd6d5692239b8449c391a3) // vk.SIGMA1.y
            mstore(add(_vk, 0x200), 0x23a3fa199f93bbdf437853790a5505ec120cb1d311b629342304cb07a77161f3) // vk.SIGMA2.x
            mstore(add(_vk, 0x220), 0x2e7711ded1fcd544e9f1aa2a82173475cd143f8111628694766546e179f071f7) // vk.SIGMA2.y
            mstore(add(_vk, 0x240), 0x1e242bd59e58c879d7ac9629be07a5396ac7d95f05496dbc2c9f45627d56c148) // vk.SIGMA3.x
            mstore(add(_vk, 0x260), 0x239a1f09cab3a4d6524ddb0577a804d883c806a55bf4931e037a0592b5faad7c) // vk.SIGMA3.y
            mstore(add(_vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(_vk, 0x2a0), 1) // vk.recursive_proof_public_input_indices
            mstore(add(_vk, 0x2c0), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(_vk, 0x2e0), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(_vk, 0x300), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(_vk, 0x320), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
            mstore(_omegaInverseLoc, 0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b) // vk.work_root_inverse
        }
    }
}

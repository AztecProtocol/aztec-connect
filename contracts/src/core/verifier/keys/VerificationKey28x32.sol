// Verification Key Hash: d8836e9c78022c0245cd010590822e42e3a94cbbd7594c1a2dde73feedd7da0a
// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

library VerificationKey28x32 {
    function verificationKeyHash() internal pure returns(bytes32) {
        return 0xd8836e9c78022c0245cd010590822e42e3a94cbbd7594c1a2dde73feedd7da0a;
    }

    function loadVerificationKey(uint256 _vk, uint256 _omegaInverseLoc) internal pure {
        assembly {
            mstore(add(_vk, 0x00), 0x0000000000000000000000000000000000000000000000000000000000800000) // vk.circuit_size
            mstore(add(_vk, 0x20), 0x0000000000000000000000000000000000000000000000000000000000000011) // vk.num_inputs
            mstore(add(_vk, 0x40), 0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d) // vk.work_root
            mstore(add(_vk, 0x60), 0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821) // vk.domain_inverse
            mstore(add(_vk, 0x80), 0x28763b9e2723f163d03f9c5e9cb2686be109c89043dbc31a24d134a5ffaf7e39) // vk.Q1.x
            mstore(add(_vk, 0xa0), 0x27d60d8e1376e933b251bdaf11d7cf8314d3ca5e5f208658e4dbf03d15be0471) // vk.Q1.y
            mstore(add(_vk, 0xc0), 0x16e2ff6a646b4b371a475a91bbd36ff02e22c75f0d4afeeaecab56ff25d7b65f) // vk.Q2.x
            mstore(add(_vk, 0xe0), 0x1df58477863fa42eda275ce17df6c2707ed89abb290daaeb866fe875f7d4e44c) // vk.Q2.y
            mstore(add(_vk, 0x100), 0x02023a039e7158f4329608491ea229a07fc5112a32ad9d2961a58e29bf7211e2) // vk.Q3.x
            mstore(add(_vk, 0x120), 0x0b1c278edf9e1db2285ef8d8809dde95f8af7aa107013c4e9fc5b70bbc0e9a59) // vk.Q3.y
            mstore(add(_vk, 0x140), 0x2183884c1567fa928798046bd13268aba2c7aab07d50a2e93e88b65eeae8976f) // vk.QM.x
            mstore(add(_vk, 0x160), 0x22c391dff72b76daf0ddbb024b26763fe56fcbc433398474aae3d7453c947829) // vk.QM.y
            mstore(add(_vk, 0x180), 0x25ffa4decc27d229173054eb26f91ac1bb9fe66b36fb1351b6a431c47c58b9f9) // vk.QC.x
            mstore(add(_vk, 0x1a0), 0x1377bd263e9a9fbb54156a42dcfc76e2bf4038777d5c3a0fcfaa037882def479) // vk.QC.y
            mstore(add(_vk, 0x1c0), 0x0745bae6f0a51ad9b3f2973e0cd9e9834266e8050b39374ad51048968c93fc01) // vk.SIGMA1.x
            mstore(add(_vk, 0x1e0), 0x1aea453cde85d8a53c2cefe84969ef09d4f6b3b1290a6ea149508a254612233b) // vk.SIGMA1.y
            mstore(add(_vk, 0x200), 0x2f7c002986e1e28312373dd29e2e3b9f1c8d82c864d61f8554c64df504ea6fef) // vk.SIGMA2.x
            mstore(add(_vk, 0x220), 0x0de4b7e3d3eec0dc58c66cda60015fb589ed2781a01328b20f2f272be775052a) // vk.SIGMA2.y
            mstore(add(_vk, 0x240), 0x0a14e2bb9eec9fb640b96f4c773d0f15fed671948fa99f175abb70fe829b4300) // vk.SIGMA3.x
            mstore(add(_vk, 0x260), 0x0582923f30fe9526a88bf2c473789bcb03d5d135379e99fa7036deac48358b0b) // vk.SIGMA3.y
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

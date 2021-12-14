// Verification Key Hash: f51b11f311b87f3d6b4bc417e8f9e572192996b153392786362739ce35b950f9
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2021 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library RootVerifierVk {
    using Bn254Crypto for StandardTypes.G1Point;
    using Bn254Crypto for StandardTypes.G2Point;

    function get_verification_key() external pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 8388608) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d) // vk.work_root
            mstore(add(vk, 0x60),0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x022e1931159da50111f284f1fd22df3ead8a63a9f2aa0510cdcbbec44fdbe270)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x280a12dec65d51631d76c98f9030a5ac4cd1d6f3cba54c9992426100ab6e9829)
            mstore(mload(add(vk, 0xc0)), 0x1cc30e8f43100dfeaa628b84d9494bc9df38dd510a11a4e61e53e8ce6cf83aa0)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x08daae5ab4691482cae5dc3084642922f2d567f8559684da1c38b16c619af301)
            mstore(mload(add(vk, 0xe0)), 0x0e90704b167fb7088cd4b5b9cf046037557403efe3354ff8bd18ebc65bffea0d)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1799bf3a4350674182ef9e07ebc84d9d9a3d738da0e3a31695f01ba100de4a08)
            mstore(mload(add(vk, 0x100)), 0x1f044180a2f7f8dd0d45078d26fde5cd295e4af2b1135246ef8bdb0e4cb64cdf)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1a9871dac7db836305140822258859d958f5a8f680cf649dc42627260dc94c58)
            mstore(mload(add(vk, 0x120)), 0x1081d0c4c25087ba5a4eee3396edcfdba828a5edda5baca2a4181be105797427)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0b0717cc8cf8a911d0f9a38e803648d6fd1f52147fba9e03a859fdd1dcf38c1d)
            mstore(mload(add(vk, 0x140)), 0x045b82633ab1fb056e2b21b1648a5c111f305a2487c935614ef56ae0952b0139)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2b95e56e7684bc41a12076b19857f7a27e35f5344f34baf6bc936df6425dc3c1)
            mstore(mload(add(vk, 0x160)), 0x15236de15f6f9a69fddd2f20ad3845f0eac25496c6aa2d2947b43cb2712d26d7)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0eab4b4f8769bb3b9c49fe5b5cfeeaa00da1161cefe1870a62351359b25563bf)
            mstore(mload(add(vk, 0x180)), 0x136495d4f51cdf67a4a17e90af16b4cbfc45860f0a2e61b25ca0c3848890b37e)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1dd58732ac982b57b559f6eeb1434e3a52e9cb9c0432175f8a972eb1af404f7b)
            mstore(add(vk, 0x1a0), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x1c0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x1e0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x1e0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

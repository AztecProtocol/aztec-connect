// Verification Key Hash: e4b83a85f0f248ebc9b8532f06b8922c9de06ae14f7008804e8114c1d063f4cc
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
            mstore(mload(add(vk, 0xa0)), 0x2c0269d718ab769eebfe22dc4414ab7271659d9d5d5ac9a2900ce5014683677a)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x08c26ca32058798fa37a10919b1f96e2164db80e4a6934cecaa19da0cc63dc07)
            mstore(mload(add(vk, 0xc0)), 0x2ace05bedd53c99e617c3733b21214a2b72fa6ff2c95513f7b98cf3ebab31f36)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1973e0b605680b856069db166b339120ec2fad1d56bac1cab73998e1b0926619)
            mstore(mload(add(vk, 0xe0)), 0x123cc4bdd27bc123d2112673e41d178edcefbf35643afebeca8c53df6fa295c7)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0f9260f7ca02b94fc74341d64556fa532932df18ce2cce07c1aa23ff88317b01)
            mstore(mload(add(vk, 0x100)), 0x29da47bed905bbcfc52bd41e9875c0ad2873d42e6d8f044a4b62398b6b4bf02f)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x04df607ff0f07e00713d310f3c84859bc4bd3ff92d1ecc44659c22c99eb63c11)
            mstore(mload(add(vk, 0x120)), 0x14e006ec6ff6bc78a98393c7ab574df5247ffb50a40f385cc0bee4a499474d18)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1a427ace22200ebe7c9c1eb11b71ff423c46503e49fb085905f2e41d21b4864f)
            mstore(mload(add(vk, 0x140)), 0x2b72e085ea639f3eaccb507f4abede19c7feac13da4efff6c7ce4c2d1574f62d)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x174e10a60e6b1259aa7605d3c49264fdb6cd5e81c16d28490f10835ae0710f56)
            mstore(mload(add(vk, 0x160)), 0x2e907698a102a6558d2dd3e69a48d727dc04c9348ee8acf226326fb38b297c5e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x22d184c3e555bbe031d37dd566e1176bc7ed3b1311bd5ab60d7daa312d9eee93)
            mstore(mload(add(vk, 0x180)), 0x2e049a86a12cd7d744ff2cb45edb274595750bb4c9efdcd0f91f2cd8d77df8fe)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x21e8db2de1c8c6df95fc349cd9065de2b45d70b1fcae5e4037c050b26d70e4a2)
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

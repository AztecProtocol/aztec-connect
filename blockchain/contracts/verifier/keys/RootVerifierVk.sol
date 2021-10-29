// Verification Key Hash: 94fd851d54e14f15a7508a0d3791d39258e66f7bc08654b73f0115e5920593f9
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
            mstore(mload(add(vk, 0xa0)), 0x1ca075d84340b9335c97fccf2ca37d68243fbfd90a6b4a1dacdecfb9a2f4ce95)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x00be9ff7fa92054c1dfaa1c3040c455bd3d60a7e8c78eb4df6b44889872d2bec)
            mstore(mload(add(vk, 0xc0)), 0x1ccff1fc8c9896d2bcc6ed863a28e16165cb9a62fefc29ea32a16913a69f9b3d)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1cedfd1c860eee01bcf69cd81bb7f17b8691e2e8e4fdbfc2e94a823d368cb5e1)
            mstore(mload(add(vk, 0xe0)), 0x2d375901c95631bc1ebdbe21192ed76ab86532b8032f66795113dff457d81a6f)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x26e3d047035b711516a52932cfd2a28e5bff9efe54cb19f78a395288d39f2dd6)
            mstore(mload(add(vk, 0x100)), 0x105a311dd6cee686297720e74e73cb3fe884e43572f4d10299732b6eba44e929)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x03c5dd2dd7ac63bc8900def2f3611fb83d471293877e739139dd3dfa1e5b6505)
            mstore(mload(add(vk, 0x120)), 0x11414d0e99a17d90d59f79c83719d5a2ea584b031b1501aadae66ac0f6653b41)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1ddb3519a9313127df8af34490347fcad23c65e4e0084a17c9e7f5d9d8938fb3)
            mstore(mload(add(vk, 0x140)), 0x21c29d2c192d515d1c5f4edd9393ff1eadbdb7083c379272ab0213eca179de2b)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x05dd8ab87bc9b9003a901995a4d3fa487d7c2b70b5f6138e0dd55f8354128c10)
            mstore(mload(add(vk, 0x160)), 0x18fd174952e52225611e6b0c5fe9c3b4b88e49df4dad8a405a6c8c9fe3505cb5)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x11126d1ab8b8d9063c85f89de638069be4e7df303f08cc7e9f3cc1761e730274)
            mstore(mload(add(vk, 0x180)), 0x2487cf84d911ec4514224eb647b7b38994884988c691db727fd8b4511711558a)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x13744a193dff2b903d47c59d717286fc1d46bdbe441b9c99bae9b01212857230)
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

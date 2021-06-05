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
            mstore(add(vk, 0x20), 60) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1523713f1be9fd76ad09a27b584cc2a374f4c1fc3623c6e08cd02bad0844215c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2d6c985939ca00b484e963c6a2ebfb70e2a791f3923a5d2de9f315a8775f4da2)
            mstore(mload(add(vk, 0xc0)), 0x1d17d86178ddfe830d50ddf97a2d18063af6cc92c6251dd74695cf3af7e164db)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x20c899f76c10284f68a40a76dffffff329369e41b0015256537608c4b09707c8)
            mstore(mload(add(vk, 0xe0)), 0x0d7fffbc10130759b0972c818efc1599fc221e87fb0152ff60a65d05c829ec4a)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x186bf3edd381f2d3bb47c4d2295f6307d2eee6cf784321ff716d44fcbf1bbfa0)
            mstore(mload(add(vk, 0x100)), 0x1da6ca8889cc9affafc6933ca1a9a66807f98593d7bf761e8bee9d59d7479a17)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x07682aeaa1e884b484ea8cd40dfbb74678cb43a1773f4fbfa0e17bfb9fea5cdb)
            mstore(mload(add(vk, 0x120)), 0x0cab69d23cab5bb6e2285fc8b6022285e20a67fa82c7eed3a12df3fa5ad87e87)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x065391f954892638aca9bdf48303918eb381939bb27b9563f3b943e757a9f066)
            mstore(mload(add(vk, 0x140)), 0x2debe343e3e6f3fdc3202f9099ba35ad1fd1da2bbf00e533887b6de0b4529968)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2f64d076ce8226427216d4c03fbc98377207f294db2dfe536a8f34a31dec16cf)
            mstore(mload(add(vk, 0x160)), 0x08f2e0c2ff59ce4b2ba5435c835efba2d0a1ce36f393f8e51f5f54ff57a5e958)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x03dbbaf377eed77ae94edb63d58218e3bbd67dd01b153e1c3c452b47c24e0a0d)
            mstore(mload(add(vk, 0x180)), 0x1460207ce6ce9bfb3d2cafa2f369a2ba474bf12e595378d98bb420e1b91b77af)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2f85e60d6f7690d6ac8ca2486a90a2b82a87443a1863c61ee7752e9cb5834c10)
            mstore(mload(add(vk, 0x1a0)), 0x1d9686eaff3871f2e00ede98f3c66bc5b2e6a5e9b796034d3281becccd14b116)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1d094a964ea4c6805d07a0a8e52c094150545657ee770b9e8a3f033b50a40198)
            mstore(mload(add(vk, 0x1c0)), 0x24ec672b23ab3163131315fc3be12ec7d2467a48593a2e8025abbc119932a743)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x09c49ba060bfb120e08d0992e41f73063278894c330325de80035838f4b08f0a)
            mstore(mload(add(vk, 0x1e0)), 0x30575356863d2be8600d3f1218fe67f7e8ab795e5d0962a1f0d4e234e6d604d4)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x06ce0c2b28845204914dc6366acf69d536accebc0c0e2417168a8f81520b8d65)
            mstore(mload(add(vk, 0x200)), 0x2a1a273e334258e7379c2ee1df6c735e264fae17eca1d49a4ec9f76bc11b9a28)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0f5ac7b7ff6265dbbf6374fd71ac41f8ed3bac4491c566e6d4dec78f7ab9f0fd)
            mstore(mload(add(vk, 0x220)), 0x191b82c4d9c74fb136b7249f925326d99da34ece692831ed22f7080fccfc3dff)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x04214777a6e1d7619cb2b8826854f2b3e40cc44e5833d4e902e9a64899ebc0b9)
            mstore(mload(add(vk, 0x240)), 0x213899ddaf47f6f713cdbd18bb706b10e44a5c588996ff57782b35eb9e3ba45e)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x157314a61cf60dd63ca84bc3ff94c956854fde6bba7f32ebe7caf5438e13b0e9)
            mstore(mload(add(vk, 0x260)), 0x06dd758fbc1eb846a98d185c4b03cece6a4ccf19b4e30b9b381ca354bea2d166)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x256919fac4675769f4381de2f2330923203f691baa86889005b10e0e4bb9545d)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 35) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

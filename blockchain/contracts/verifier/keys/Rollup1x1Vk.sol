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
            mstore(add(vk, 0x20), 58) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x092a79e199382ba2daece731a824c1394a56e222202ad4d6981fdd7f138f3efe)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2fa03fb349e2aed04b63c4e0428a6f9c27e72baf963ce1d3ffd05c2b2a6dd5ef)
            mstore(mload(add(vk, 0xc0)), 0x15629205479bd2476fdb62636f365d7abb7cdba3bc550ad7fe2b9123106899a8)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1124b3660b041b0b092bffc01f3a4f476b3e0c76f7de531c12240c1e8f1d11fa)
            mstore(mload(add(vk, 0xe0)), 0x145fe3ce1d43036c1ef5b5a201683cb53b93a50b53cfa127031e3538c81dd0c5)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x164298347afeffe213bd7ece465b4177240ce6f53b5ea5c16d651bd454853714)
            mstore(mload(add(vk, 0x100)), 0x17e6e1c9c0c24492c315649dc8841dc1d30bbadacd457b7a505b02efa83050f9)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0e14dd4db3e3804e55ae9bc42b639c022929d9fe749bbaf4466c0546cce6e8ee)
            mstore(mload(add(vk, 0x120)), 0x07f971bdd12877e89c52fb702b72914adf7fed8f122512e9ba8fd33ba21b0d3f)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1c20feca5e774b47e703b70960248c515dd93db66a7eb8771375d55fc822d482)
            mstore(mload(add(vk, 0x140)), 0x2bbaca61c6518715a07319cc01b4d4091ea71edf0a44ab1548a27ab3a59e7733)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x001d4c30b4375ee9a3d0abe5b84591038b530ce9d8195a30069c957b1f54d3a7)
            mstore(mload(add(vk, 0x160)), 0x051fd54d4e505865457054ce8f743c39fd45e0f108964f4ccc9e9cf826d47dec)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x28cf0a3afdc217f245e0392e57641eb2a4425b78621e856afa6ac66520d5f1aa)
            mstore(mload(add(vk, 0x180)), 0x056169454b46c1530fd29837e9722af69142892a26cbf56bf7dcf08101cc9bd0)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x08bf616595eb02087eaca8b0c9b6fe8b94bbbf327696b3a7612a2217b86e6831)
            mstore(mload(add(vk, 0x1a0)), 0x23bbe7e7971862dc918770febb29844ddd240739745d6d69f947912075dcea17)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1712b67b7b8025b74113122c83e1cd27a0583fdec08c8039c3437ce8eb613d94)
            mstore(mload(add(vk, 0x1c0)), 0x2fb5be4a9438f507f49aa0c8294f4819d63b3b810b6dd17c3ba4b49f6f5a61c3)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x21b7b0cf1a3f2c12523adabbeab3c8a37e592cd329fb39bf458a3e9e7e83c45c)
            mstore(mload(add(vk, 0x1e0)), 0x097822f42295c7e0e2632d48d54c5449ff42ea80f4c5306a122af66e569526e0)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0a9b72570b641cbbfa25de76f1f47724e07d61e02e125c4007368b08f5cbb2af)
            mstore(mload(add(vk, 0x200)), 0x0f960476336748c854d5adad1b5e916136b96f0a7e045d072badc8ccb7b312f5)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2311dc0150a91bd3214a552c9cc772019f3332b7ee85b568bde91e8ee9540358)
            mstore(mload(add(vk, 0x220)), 0x124dcdefd70a325ee7bfaa4512c23cb6e2432e8960150ca172235f97c7d092be)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0a34b6732f8eab77970827b5a271ad312b179f3a4eb223afee9494757b55a59b)
            mstore(mload(add(vk, 0x240)), 0x08122db89bc94bb0942d097e5206606627e914af31f5e802d210e02135735c52)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2e05ddaf3e62201e03e11f74f7f6aaf8c1e7a591ae53340658ef841487e55be3)
            mstore(mload(add(vk, 0x260)), 0x1b372aa7a77d3c5ee64e7973bcf030eecc133524b57c6b93c6c7f0ab2785a317)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x23dc333b0779b75588517b089598c82b7568dddc84fd19be395df3504d1f18c8)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 25) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

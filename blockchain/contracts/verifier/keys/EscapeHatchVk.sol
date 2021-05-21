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
            mstore(mload(add(vk, 0xa0)), 0x24836ff3df555e289a28c89c797928f6faf64092c9084691209cb9056dc17072)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1211b68c79400d3c93c62dcd50a24101ea8d53bcc886f4a8036c033df648e000)
            mstore(mload(add(vk, 0xc0)), 0x066a7b9a85b50fc454e2caed3b1134161582e9b05ef46d29634db16061c7c970)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x005ea52134fffdecd672fefaa1070421024afd555ff0f1bf013e2b6b52997a2b)
            mstore(mload(add(vk, 0xe0)), 0x041a83536ff86397b3cd4ef435c2de832fdc031c9ffb086ae8ed951561d85b0e)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x10eef5276e388028ee70ccf9b062f1fc6c033e2421caab8dd89b263e71230cc6)
            mstore(mload(add(vk, 0x100)), 0x07288d22e8a75ab040d65857fc357003836fb4be0552a241c88b7df1d61fd544)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2ebfd3581e5a247d31208a5502561ca8e035c17ab9720539f7afc0531164f7b5)
            mstore(mload(add(vk, 0x120)), 0x06096d633e3a1ddd9a450458208ea603138ab05443de92e3947144e5c5281f60)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x224fc7277a3f6730c9fa362821afedd0fcaf54562b8a69a54d0782ced5b3daa6)
            mstore(mload(add(vk, 0x140)), 0x21950585a830f464ec0d082c180264e34be19e83aa56a31984377295ca459d25)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0f1478e5d7f1d81adfa6c8549586f9f7493c90a735e2ea44a863fc8137496bf3)
            mstore(mload(add(vk, 0x160)), 0x2991f227b7bd82c9001a95265f9bed1656818fbc80af85611b1cf3535451f563)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x116c23bea0607f69a992352955a86a9ed422e2c3299dc69cc5ae9b4c88fd15e0)
            mstore(mload(add(vk, 0x180)), 0x1def0bf1cbc97620214317828c64c3cb3a880e51330f64daa5d194c26ad4ad3c)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x02da6cce4321b256a2545ac5018eb0ca69ab34e00a8e96778e6f055d61d716e2)
            mstore(mload(add(vk, 0x1a0)), 0x107a481d9741d42d41384994a6f662aa5f6ef8fa516c374cc6835afa04351acd)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x3016defa73416010ae205f004703fdd2b0263d3985372def16f8c79e045b5ef6)
            mstore(mload(add(vk, 0x1c0)), 0x22b1954afceca437e74b7980d1d25255577f080391ed22e47e7634d53265004a)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2954a9de03da8fbe0474075058ab9ab7c519b4e1813256d6c27366f6dc5ce290)
            mstore(mload(add(vk, 0x1e0)), 0x2cb97722ad05035aa472a7d6650b6e5b7ba55a6f9650af3e69a083eca5ba7349)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x154d12c0a9a4782abdfeb334931acf3638c2be18ffadb8c04f3bc0662417c842)
            mstore(mload(add(vk, 0x200)), 0x1b7277efa8e5d7639c3325809e76e2ae8ef80dfd09dc93ec1fd2e027194cc314)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x27df7ffd649ff7636786661a5ad1b77bb81affabbbd4aeee4a3d2e89c5a287b3)
            mstore(mload(add(vk, 0x220)), 0x233d29a70e9ea819131328a0768da188a25f576cce317654972ec06e1c1d82da)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1ee4e1c8747a5c355128cb5ff4c0b53ecd6906179767c6170acb1f5480603b3a)
            mstore(mload(add(vk, 0x240)), 0x2d7d0e5efdf720bab8f9d5dabf8e4c1e488d89ee01c7d59be6df2d1dea62a60d)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x300ca6d99975a30fd75afb7e4896adf75a177d1b577321178a5ddf12e5202cc2)
            mstore(mload(add(vk, 0x260)), 0x1cc21fb589435f097c2055feb96cbb9acdb860c7f50b7d52e56c26e84c7c1be1)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1acdb744ae5a6a336d96a175db8ad1e7fda81677da08ec8b307fc266ddd26f0d)
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

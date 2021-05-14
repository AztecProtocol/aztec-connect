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
            mstore(mload(add(vk, 0xa0)), 0x0a6139459d8e297c9bf21c189a1b046fbdb8f17fdc7621aaab132269d70e8772)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x28f2d0f5c88474aa2404d8fe6de93339ca697a1eb8f2c609777673400c95ea64)
            mstore(mload(add(vk, 0xc0)), 0x1effd8bc75b03e0bb51ddf3c205bf5523b26ee1f255191ec246678fcde60cbbf)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2554633cf969583fbe69cd064fb77fec9b47b0b7e40316bb35510f511dcb6a63)
            mstore(mload(add(vk, 0xe0)), 0x16ed9ccf3ba820b5af0ca14f58025d370c0a969f30bcbef8537f5387fd43b344)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2a3cb13791f5bb285df0e9e5056b3aec75849164d10dae8d50ece967afbd0dc4)
            mstore(mload(add(vk, 0x100)), 0x04476448e9521bdc627acaab70f8a32d63f100ccdf6961bc6b95c70bd654516f)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2f8c48f39944f58948484c1b6ef3dc407f297d662818fc82030494886fa4d36a)
            mstore(mload(add(vk, 0x120)), 0x24c92cbb0536e1953482c0a174784d5007fbe3ee468ea88274fc261396f7649e)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x075a0d8ddabedf2f69e97a730df1c12b35de7c81cfaa379af9f724993d734f98)
            mstore(mload(add(vk, 0x140)), 0x159ceb8254e93c12c604384eea1542fe00e18259f8b588fe5d0a292d6d0d115c)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x28ffff63768cde1c0279e922954b2d4170de905677c1b48c8047b8f6ae59fe43)
            mstore(mload(add(vk, 0x160)), 0x2be9f5557c0cbad78e6f889b765b898fb05ffe76b7cee9fa36d7656bec3c1e18)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x08f3fe47708084e6e0cddf6df7aca88279421091b2a269a3aee68d2d8e0240b8)
            mstore(mload(add(vk, 0x180)), 0x1def0bf1cbc97620214317828c64c3cb3a880e51330f64daa5d194c26ad4ad3c)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x02da6cce4321b256a2545ac5018eb0ca69ab34e00a8e96778e6f055d61d716e2)
            mstore(mload(add(vk, 0x1a0)), 0x2f2b8a573683c5b2c8e49e0f5655e8975d68701a3cac46eb5856caddfa6f65d5)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2b42ae82b7984d90530ea0b3046b8499b6b972f4dd3df04d785ad17d480e27b7)
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

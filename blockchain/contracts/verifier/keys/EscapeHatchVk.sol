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
            mstore(mload(add(vk, 0xa0)), 0x1279d2085cc7d5cd109ab9dd43ff33cb95c7a13046b453a4bfb61bbdd72492d2)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x28ab33a6fa82f60cdad385a78bcdd940aaccd9a7cf9b453ac8c80aac1b4777fe)
            mstore(mload(add(vk, 0xc0)), 0x27f67bd4f2baa8fcb9eb46fa5295491ff1081db334232b913925fae0b0329961)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0faf0ab4d5d4177b157d05d7956a3e7efc2e7786ab8864605e2b3b6b3f8ae3b5)
            mstore(mload(add(vk, 0xe0)), 0x014ca3daa697ac00fc7de92d65456acef16a42be471c75756fddb5237850b350)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0375707a4a831032ee8611f7b0ef4a7b03399cfdf9f1235cae1199aadc49523f)
            mstore(mload(add(vk, 0x100)), 0x15d63ab4cf44a3fdcca802224cc3d5da9a9dde520363f22e436c7b442bdfc626)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2571127f4c6af3eb0b5faffdf0c14b52e57a61b9788727afeed2e1b45bb6d1c2)
            mstore(mload(add(vk, 0x120)), 0x14be377de9fbabbb4aef102f1d2ece5770e2d46e8dd30876054e4b64af9c35a9)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x01b810b38e1cb22cbf270e19cb150debdac6ab8fa38b66e266b1a55db3453855)
            mstore(mload(add(vk, 0x140)), 0x2d01e34f2251daa161281a8d5e6a163d58c6672683e7e77f3a76c92b7c8d4e93)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x262c29a17182888bb5499f98029b04dd74b33150c89f82233e932d52e1812ca1)
            mstore(mload(add(vk, 0x160)), 0x0e65650672209a49af8bef4a76ec549d56d4d0f28e1fed391cb2dd592066d6e9)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1a60dd5babb1e856ec8eea11fc1e2fd6546a5555be097d58437cb0cbff25b920)
            mstore(mload(add(vk, 0x180)), 0x2929e4fb516b4387375d4a42203afac5c218fc9b0b680d9fc83119d59948da9d)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x22b1f8d3d1aa27b317984ecccf9e5af9e07258a9dde282a3a2f15c0a8357ce08)
            mstore(mload(add(vk, 0x1a0)), 0x014bc072259718b55bb0fb3edb5118e4824e6473da3c4c65100f7d64ad45dce1)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x128eb91aa74e12801bd61c6027450804979f053eb0c99fdcc8c13daf147c0853)
            mstore(mload(add(vk, 0x1c0)), 0x090b293c05cb024ab4872f57f5ff36216155f2ea362cda33c9f38bcf92ac34a9)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2524fd5a1fd9ae231b821fbc8267642cf8efc3dccd7f33d8e32c0c2c70338788)
            mstore(mload(add(vk, 0x1e0)), 0x1886069e4af02aab5feccdd3dc48f40c3940fad4c1ae712e6e192e408050560b)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1e8ca495b98ef622e367ac42edf7bdd6c6a56ae2cae87bb9fb0ef29413f0e3a8)
            mstore(mload(add(vk, 0x200)), 0x0f88644a940dce7b381323b2b29e879508a6c1f5c56f227565c4ecb506921cf0)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1fc4901ccd07a280a0317940225b0c8c7fd4515d0fbed46ded77a5cd7e8fc540)
            mstore(mload(add(vk, 0x220)), 0x0f0259931fea8cc0f1f8fbf4a118dd097efc00d47fd579e29ad5b9b806896514)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x24424eb4cd780341b9c16b5817bbe9a3bf8e0e18389866c3768f74976802109c)
            mstore(mload(add(vk, 0x240)), 0x2d478be2413dfbb000f5695cf291843469a09291506b55eb878f90c43c2f8618)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0c02fc72b2a78f75a063d32104ca0deaba3fb1210a1017e6a7d66a63f8c24331)
            mstore(mload(add(vk, 0x260)), 0x15edfc8c28858c9c3f827169777bc657fcc3006e7e40cf4993df86a99918a4e1)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1081c10d1a67ce208f5832c8217669ddbc43b75f005f2c5ce1af4d7efbd154c0)
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

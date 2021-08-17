// Verification Key Hash: 9facb2abf628d31f7da9ce402d625644a722fee690dace38d3bffefd72c2c573
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 712) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x29bf691d0eba1ee5bb3828cef01fbad806993e48d1aadd63150899f3161bd195)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x06c98b090b396343895b46e057f263af4053c6836d36d3d07a77e058232207a4)
            mstore(mload(add(vk, 0xc0)), 0x21672d4a5d547304bc549f9e3c7ad8a190363cc2ef8ad885e467e33fe65b1b64)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0cbc276016426d6991d90a96a828cd837a6c89a9efe5c6c845bf3f235d524da2)
            mstore(mload(add(vk, 0xe0)), 0x2c38c560a9d3a48a545e2d67a03c9a150b3fe9957f9e7efb47cb8d1436a0dc67)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x28808c9c804132889c1c303700f07d457caeddd267b2d5c6f82624d4f5cc5f85)
            mstore(mload(add(vk, 0x100)), 0x0fe53b7418cb9a4f7cf7a76b6a6a8bda0ced921ea4d5718fb03b7f873c85cc10)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x238b6768af5bb164d8fca43562fc5b264a05b0e8b1019866692c18cad667d807)
            mstore(mload(add(vk, 0x120)), 0x1ddfbb40ee0a94f78efa5110f4f4955ebec06cbcc8ee587dd3bcdecc953dc78f)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0e53b10cb5bb2a4aa236163c5578cf64c9f761cae388ad3a847a724050997048)
            mstore(mload(add(vk, 0x140)), 0x062675fe5479c191a91f60c37168f80d0940343d935a1164241ee3df243617b3)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x276433b11b768546887cbf236dd017c428f5d43d4dc9798cb556c4263fa2007a)
            mstore(mload(add(vk, 0x160)), 0x1c8c4d6e0896157e96154f2ebadd2b6979a4c253e65ed341fc9f7733faa50928)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x133f7a8d1e5b6511ead9a7254be608e679f7d74d3c970237d3ab9650ae477a28)
            mstore(mload(add(vk, 0x180)), 0x1a641f0a50e2938c2f2bd0203effa6b9e5c9c3a9dae2935c1848e5386b648307)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x07375b1efb134c282ef90388d004dde494e9d3cc5bf69a3a16cf67ab177d20a2)
            mstore(mload(add(vk, 0x1a0)), 0x1d4ad8cf4bcfe1e4c859d80779b7579d992be08bc365025c022d21ec5e58ee76)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2640c36d19b2a68a5795e7915fc48b86f158a1c0004b14a8098847747c4a78e0)
            mstore(mload(add(vk, 0x1c0)), 0x29a424cb41190e62cf1662dc69f7381cd7a7a22d1f477c57d132463c18062272)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x28e505277f05e72a14cf8849c0af6508699d3bbfafb918eea099d32d20da3478)
            mstore(mload(add(vk, 0x1e0)), 0x2b7b738dd1871910578968caa58195c18af6d8ff3fe8905fc3adf9ec68f78610)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x17b0226e6b95d7440f214aff4277cb0900d6fe410d22765f8748acd721cd1770)
            mstore(mload(add(vk, 0x200)), 0x265c546e507533e589e7b26f326dc283f4574b87c20a9adb923c425797dccf11)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0a49a667fdf1aa1c71a3b6765622e03c429cb0bc4e6b82bdcb74dab57c1ce36b)
            mstore(mload(add(vk, 0x220)), 0x29a652e6d6aa494fdcc429af99856a20eb25bf49aa1ec2bd11104816abeef51f)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x039295c02c44e51cf825bb3ee452c9ec795ab54733b77d6ee3d53c9399b2dfd5)
            mstore(mload(add(vk, 0x240)), 0x2f9064a15d1a5c3215e1f38b172fb53beaa9b0c53d7a9f0be79b140748de7d8a)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2685776cb18e1bbb2f79e3c5634e2cf554ed951f173d151f836765d2e82e3e56)
            mstore(mload(add(vk, 0x260)), 0x1f36a9c395500add7ded60a5e0283ccf140103564b29005b073edc854781d66d)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x11d1f8db30e88348fb70e8c354aca74eb4c7b2ef80b06488d9dfd9a2aeebe850)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 691) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

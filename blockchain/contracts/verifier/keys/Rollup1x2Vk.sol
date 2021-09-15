// Verification Key Hash: c7b9d1fbb081e1757862481799bf26d7ccd108c7a04bf13b34f3e4294fedae08
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x191e8dfa5c6d76c44bd84076dd7f359391d9a78aa6cd58565d355f22ecae50e1)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0cd33cc78f49cd4c65acd2ee4f0f3b8c1d44a929867b06a3e5dfb9a496338b70)
            mstore(mload(add(vk, 0xc0)), 0x15b64341860ad03249b13f353fc0dbff29069849d9ad4716b05da33153f189ee)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0d9725841de277b129631e0ff0553e520f4015aa4ba412dc280f1fdef8c49c91)
            mstore(mload(add(vk, 0xe0)), 0x243d01fad82db172014baf7c0f69e01a643792a8c3d8c2797173f5f3b81d583f)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x13a670fb351a2b777f5d63b9e7876c25da2d8104007e811320c2b71c5be495ae)
            mstore(mload(add(vk, 0x100)), 0x2e17589dfbaf6c846af21cc672456612cb1b35ea8958857fc73a5798181655dd)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1efefc1107f82d4fecb1c0e937f1f0f16e649afc3b59efde35271d6195e97b25)
            mstore(mload(add(vk, 0x120)), 0x16d920f39009931ae9e88eb89b190b39fa68978ee431abcb3340981b2585423d)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x028dac775c1783ba57ad0c01826faeb89bc9c8a087301eacc0cf2226d9e9bd25)
            mstore(mload(add(vk, 0x140)), 0x2b00141eaf44c8bb773ab2efe935d13d13e902b6079e9b4a4c6c8d47c9570c9a)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x05afe4a7d67708f375c65daf1b33ef7941ec5cbe29104ca1f5993720bb5109e3)
            mstore(mload(add(vk, 0x160)), 0x14e10db4173eda04cbbb88335c261ffafbdd9f582ac0d7fc9b4f1df0258af0f2)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x291daba60c0dfce0e8bc5da66a118b918025f222111c6e09b5fbdf5afa2f7e65)
            mstore(mload(add(vk, 0x180)), 0x1c5353f6d165ebdbd1742a996af336ea5356bf5bb233ffd28e02ce42465cda18)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1aaebaa0271f48776688151610caff5e7c97bb68878e86bfb9844b43f4308c54)
            mstore(mload(add(vk, 0x1a0)), 0x27c1046c2621f4fa8286218edbaa6f39e8eb667527afc4134e7f4184fe218dec)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x13f52aa592d65fcbd0f4a17092f4a55fdc289dccddc8c4f9b98d6bfc9158a610)
            mstore(mload(add(vk, 0x1c0)), 0x2c65c6b16b0fc4a65bdd78eae4797f81ed5115e443b9f056ce2d31f28bb7dfa1)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x244ba269d16b2b0b5695750d3151632fbcbb0430b4383130b6807acfa39fdf0d)
            mstore(mload(add(vk, 0x1e0)), 0x2d8c2535c9c087dce28313d6bb2d1a58cc5f5adca7e49cd6ac99ce0e253c05f1)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x214cf98fd2ccbf1c2eb7b9853481bbc1d2b29a7d33a3ff05ad051597dae38a0a)
            mstore(mload(add(vk, 0x200)), 0x1a9cea2bdaffebdf4161e685b5df6218d516958f403e7c61bd4dea6f651bb3a5)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0c80360d4de079b3b3487a312451876590814c941c26bdcf0dd1df2ffee02cc3)
            mstore(mload(add(vk, 0x220)), 0x0c5568e69d4f7e2a94050af42cd8c4f225104344908b66eee6ae256dde03d1b7)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x022d5c62bfd66fc1868d8134ac03e147379f6c50ab290540901f0d564d55428f)
            mstore(mload(add(vk, 0x240)), 0x17329b06085c20ce0c8068f644bcb3b1edfaaa36740b6b4373b5af4057af1990)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0b1080f160f0547d877d6d2c7b251d55b5436e8057cf6481932e71057974bcaf)
            mstore(mload(add(vk, 0x260)), 0x2f1a9058d60f26054944d1e911ed700c7f3ba6cc574f630d7500943ad22c5a57)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x07380991e98da900505b6e2ae293d19abe84939f49dc2e648f07b14bea7e4a59)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

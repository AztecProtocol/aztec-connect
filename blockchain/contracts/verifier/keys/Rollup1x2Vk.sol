// Verification Key Hash: 1241570ae8359dc59b935e6997ed2768a0aa1b95ae149a80424aae41f9d4c650
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
            mstore(mload(add(vk, 0xa0)), 0x2839a4381fea5207721c6df50a271da10fdda32bd97c8909090e01f5da989d0b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0cff7472a2bd7a192b09a0b8081f0ad2f922497c6bef6675c61640c5cc10b119)
            mstore(mload(add(vk, 0xc0)), 0x272c52e3810d3eb956bfde5e2205d3fa4502f320d14b5a3df7e8a2f9934cf9f4)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x21adb61dc914c7f2769391aa667ce8b3a018d23c6ccfbe3240c65b4b05272088)
            mstore(mload(add(vk, 0xe0)), 0x243d01fad82db172014baf7c0f69e01a643792a8c3d8c2797173f5f3b81d583f)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x13a670fb351a2b777f5d63b9e7876c25da2d8104007e811320c2b71c5be495ae)
            mstore(mload(add(vk, 0x100)), 0x2e17589dfbaf6c846af21cc672456612cb1b35ea8958857fc73a5798181655dd)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1efefc1107f82d4fecb1c0e937f1f0f16e649afc3b59efde35271d6195e97b25)
            mstore(mload(add(vk, 0x120)), 0x16d920f39009931ae9e88eb89b190b39fa68978ee431abcb3340981b2585423d)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x028dac775c1783ba57ad0c01826faeb89bc9c8a087301eacc0cf2226d9e9bd25)
            mstore(mload(add(vk, 0x140)), 0x2b00141eaf44c8bb773ab2efe935d13d13e902b6079e9b4a4c6c8d47c9570c9a)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x05afe4a7d67708f375c65daf1b33ef7941ec5cbe29104ca1f5993720bb5109e3)
            mstore(mload(add(vk, 0x160)), 0x17c90b2e84972d56f9ec2832c9749563d582771601e288a4f7a5c4c8cf2119da)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0cc9eeab46a584057abfe7d978099e8efecb3bbad2ded5f23377851333c46963)
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
            mstore(mload(add(vk, 0x220)), 0x1357c6235e41b158569472eed3850cf80ec1c06c12b06a263fdeff0f8300dce9)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x105d35981ab31046b7610a8c4101d2a21b9ce35d3630f6347259e4352e546dbe)
            mstore(mload(add(vk, 0x240)), 0x1625cd50864e4fe2b2a9b6178f20ac53dd079172c923c86fecfd1796748e2170)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x179a6095f718e9001cca577ab7c390e4e5c711fc73f822c0bdbadb808e640889)
            mstore(mload(add(vk, 0x260)), 0x2c5609751c2f9f82106d60e350f4ed986201d109669f15e64927730f5aaa5f3a)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2e7688efc9992bfca3a43161a75ac87d40febaa558950892a0baff6aa1b8aa7d)
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

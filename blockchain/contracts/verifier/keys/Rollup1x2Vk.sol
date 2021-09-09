// Verification Key Hash: 25e3ecccedb0f81aa5b6345eca0e9ef0f12181d31788d9f42f8a40182245a6cc
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
            mstore(mload(add(vk, 0xa0)), 0x11f3ae97229241517a0bbdbbc853aafc831d4a42ed8911e3b5fcb0eef77420b6)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x17cfc0774b42de3c0cad93d279649f6965982090dcd81ffc096995959c8a5fb3)
            mstore(mload(add(vk, 0xc0)), 0x191effdda1ba6fbb29553984fb437b25bda2c0e54a1f7e9db84b25d5b7f20289)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x01c864374f3979082b0374c7b4d5ef82a5a22aa3d930ec4a4a920ee000694b49)
            mstore(mload(add(vk, 0xe0)), 0x243d01fad82db172014baf7c0f69e01a643792a8c3d8c2797173f5f3b81d583f)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x13a670fb351a2b777f5d63b9e7876c25da2d8104007e811320c2b71c5be495ae)
            mstore(mload(add(vk, 0x100)), 0x2e17589dfbaf6c846af21cc672456612cb1b35ea8958857fc73a5798181655dd)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1efefc1107f82d4fecb1c0e937f1f0f16e649afc3b59efde35271d6195e97b25)
            mstore(mload(add(vk, 0x120)), 0x16d920f39009931ae9e88eb89b190b39fa68978ee431abcb3340981b2585423d)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x028dac775c1783ba57ad0c01826faeb89bc9c8a087301eacc0cf2226d9e9bd25)
            mstore(mload(add(vk, 0x140)), 0x2b00141eaf44c8bb773ab2efe935d13d13e902b6079e9b4a4c6c8d47c9570c9a)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x05afe4a7d67708f375c65daf1b33ef7941ec5cbe29104ca1f5993720bb5109e3)
            mstore(mload(add(vk, 0x160)), 0x0c245a2f479658d5ba5c004ce5ab988ddd2e0ec96781e3b1165f6fd87b2d61d0)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x077f2dfc808c3eedbe400cc19845a4367290f1fc806429e90fa617b998a2f7b7)
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
            mstore(mload(add(vk, 0x240)), 0x2e0fbfaef7ca3b27ec4780ce22ac3869aaa58c8b327259220375804c1c86c7c7)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1a6849558295ddadfc5fbf796f49ce4ca69bafe87ed257689640ef0c8b9ced3a)
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

// Verification Key Hash: 272dc68f6f14593a8ce780f531a83d8905181ec059ca97c13257b665205fae4e
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 112) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x128191bd08d6d4e5e30dac822209736c58630cdee654d1ae99ce61f9f2a55d06)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2d79307a8f6cb7379cd849505c3856439d3a4a27e88472fd5e7767f6109aabcc)
            mstore(mload(add(vk, 0xc0)), 0x2e295e12a735e2b0ebfe2a1f5daed1a1bd8eed4c9b62d90875eb2eec71bd41f7)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0cba8217c118b935684ff34deb21a43dc59d50b1d850ee95680a82f900460a35)
            mstore(mload(add(vk, 0xe0)), 0x2387bcf1d3965eff86c8d2ab1e3f7c07978ac8de6d6060e4d59748f1033f8823)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0e759d2b304d8a856963dde82877c86011df50e80f8ca6767e91496754d9e855)
            mstore(mload(add(vk, 0x100)), 0x07c18bb39461f458708d659fcf25af7917219b8e98253b86490730bf69da6a00)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1c2c3d2b156c03c6d80e23caf55e4e1b3444a8335a039ede18b05a6a32249a71)
            mstore(mload(add(vk, 0x120)), 0x1e00da6cc5b8f359f7088e1b30961d7d753e5282a3870cfbf8093735892e9f3a)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x144acc49b08230732ba6db81a5de57d70122acfe694f4a13053fd7e5ec930d35)
            mstore(mload(add(vk, 0x140)), 0x051b3f9c7a95a121000a1ff784675284b3c4410a270a5f3b247cdf0b5d5904c4)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0c2a2658957ef02e679672c0e80619dd5bc767c785ea7a7f2c8f60672cc0fc86)
            mstore(mload(add(vk, 0x160)), 0x2e9717b96aafa95b12b1ab311c8753f1dd5555ff798e17cd68d22c5423e12e30)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0915651ce8370ca98bcb57b08add5a0f1c35682cd8e46d6acf437243cab0ca47)
            mstore(mload(add(vk, 0x180)), 0x0aec6e3b5f00754b1f46f1831d0f467fc4812d1b153f2a1bf4268d64311c542f)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x07cf1aa17752134053c3edc9a5d61f75ec35e9ec9b138b5e9136e3b3336b3028)
            mstore(mload(add(vk, 0x1a0)), 0x12bea8b1ac6eba28ff5e8745f3f78c15e976ca6e08f935e0bbb5a0fc283fe6b0)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x03487f50c2f7d26bac5903bf50184b2e7ab5593a816371ccb1b9e2b362996137)
            mstore(mload(add(vk, 0x1c0)), 0x214b46ea5e888af6b8ca26fd935cb74f5fd512737a5681d78fdff021e4c9bfd0)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2ec53bb6662da609726e1500c7a80e41ef4e6ed1e6df4086f68bb5fce773005f)
            mstore(mload(add(vk, 0x1e0)), 0x1889c7a5d92c051bd4422894bfd05f38eec083914a3f5367a16ae0c40a87dde1)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0546cffa33fb76f60112e84c980e603f01770c082519c0ae66db86fe0d1d29e3)
            mstore(mload(add(vk, 0x200)), 0x2e8685edd5e29d35131b9d10ea316cce738069b367abf52b53b7fef62d51f475)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0fca6bb88905141bfbfdc304fa23a0d81a76d27c09f4f029f1d87f432b291921)
            mstore(mload(add(vk, 0x220)), 0x18c1fe24de4369d1bd59e430edc32843aa7cc0bc259942c9bdbf602e7043a77f)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x04d3eab32820b2342111beb753bddbb0b9ac67a19104290a4a338483516edf25)
            mstore(mload(add(vk, 0x240)), 0x1e71ca5b2bc3b8af5c325b4798847fa4f7c2cbd7089ed7c7331f0029d07ef47c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x27b8092d87a0ddec231ce5db8539adace283cd129da9998b6be8b02b8af1c57f)
            mstore(mload(add(vk, 0x260)), 0x290e0ed3d1875167ecf4d0f091298b308a70dfae24ba52d4b671c5e2b63ea054)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2e898be3f431b71fdae3d8a3d791d20d98429f434614a8d3fd581908e5e98356)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 91) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

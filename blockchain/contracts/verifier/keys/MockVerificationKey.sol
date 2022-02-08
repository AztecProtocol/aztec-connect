// Verification Key Hash: 3ef812172abd015fb257a552d348ad717a3635cdece13b2e71729cdf6c3f316f
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2021 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.11;
pragma experimental ABIEncoderV2;

import {StandardTypes} from '../cryptography/StandardTypes.sol';
import {Bn254Crypto} from '../cryptography/StandardBn254Crypto.sol';

library MockVerificationKey {
    using Bn254Crypto for StandardTypes.G1Point;
    using Bn254Crypto for StandardTypes.G2Point;

    function get_verification_key() external pure returns (StandardTypes.VerificationKey memory) {
        StandardTypes.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 8192) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x006fab49b869ae62001deac878b2667bd31bf3e28e3a2d764aa49b8d9bbdd310) // vk.work_root
            mstore(add(vk, 0x60),0x3062cb506d9a969cb702833453cd4c52654aa6a93775a2c5bf57d68443608001) // vk.domain_inverse
            mstore(add(vk, 0x80),0x1670ed58bfac610408e124db6a1cb6c8c8df74fa978188ca3b0b205aabd95dc9) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0b4eb1695e79b26ab38c481b8edb57e7ec407fdcdac16a02c84470cc542a2955)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0f4f03af0870579cfb3e6f001b969be807969361aa23bcaf92a07d3b9ee59fc4)
            mstore(mload(add(vk, 0xc0)), 0x1cca80dac7253b87aa094c6f4d15a417d098586c341b8cf39cef85139b9058e1)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x20ab676f17bc060bfcdd45d869e7c42da99c5876429f6fb5a53000a075d951fe)
            mstore(mload(add(vk, 0xe0)), 0x1a6f6e1306bc4913f71dfbe0f08928ec9888a0c1fdf4f65c67c96840b15e4d47)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0068fc9347098dfafe2633e435cab0e92243395e63c7551f1868f5f5870df20e)
            mstore(mload(add(vk, 0x100)), 0x2c14cde2370404e821e70099e7272c568d1ef5775e7adc08b9a5a676fd220987)//vk.QM
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x17b390f04ff966e9fe5ccc843c26f09aa7fb9ca914dd67f4dcfb0b74247941ea)
            mstore(mload(add(vk, 0x120)), 0x139ee5ab00909f59e8316652e888be0164cce7ec6b01d5e594bcb1fd6a1497f8)//vk.QC
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x135b83698d1474effcecc46d24454bf3050e6188b2cff968c4fc2758ddafd38d)
            mstore(mload(add(vk, 0x140)), 0x0cf8086b8f49687760fbb0e8fdd6e74c5fe968c48c24f0b5224acff3ece71219)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1ce610e0a986cccabbc4a6274e63f6dcfd113ae6b902ef0b27a9dae51c8cdaf0)
            mstore(mload(add(vk, 0x160)), 0x285cf54bee0568558411e5cbb5c590b01c36627f085dbd560b16f15aa11287c4)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x04c8777253df08ccb7a51771f993a7e9bdfbc846ed9c5e3063b9bc2f639e5af2)
            mstore(mload(add(vk, 0x180)), 0x0bc00d1669891f578c5668dcccc705140acf0c720715de394a3fb18a5c08f619)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x240cec8a0ae770ee8f1e0ab70e464718fec53b3efacaec1ac28b84790db10406)
            mstore(add(vk, 0x1a0), 0x00) // vk.contains_recursive_proof
            mstore(add(vk, 0x1c0), 0) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x1e0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x1e0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x1e0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

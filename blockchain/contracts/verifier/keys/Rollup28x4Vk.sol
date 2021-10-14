// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x4Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 1566) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2235e845ffffce329781d42d3749a3e979e32056259764e53ed87c0a7fbb7621)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x16ed97eb129ac46aa1793c34064f4dfbed9bef7a04b0833393375a9fa4bd8f27)
            mstore(mload(add(vk, 0xc0)), 0x04d9bc6b231782b964ac52bb8a541ae7afdc15cd77e163ef5003db84bee9db67)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x15aa1a98129ad341f224e0c6cb0ccf7140f80a6c3b2818b97756d29750cdf65b)
            mstore(mload(add(vk, 0xe0)), 0x2b51c97692a31d58050514812c665e88f0693cfd2b1f1700e7b292f38f131eab)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x02293ffef9cd3633dc81263189eddaf25229cfd885c2841fd7c649038e0cba99)
            mstore(mload(add(vk, 0x100)), 0x0cdbc42be8e617333076b89441a6e3fe4531efc53379f26e40713dcd6581f254)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1d3f54958bcef1bfa5c609888bc5473b7b786d55eaeccd123ce527eae46039c0)
            mstore(mload(add(vk, 0x120)), 0x11780fe296089b6cfa66ccc42e58e52ea8fff5ffb1f16126385998381e5701df)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x01805831da0d3467b60c0e97e97028b5407531dce50fceb99ed270c53be75be2)
            mstore(mload(add(vk, 0x140)), 0x162382cda216393cc1032930468becada75a61b4b699954a8d3354665e7bd864)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x16bd9cc0531489d3e1a1bb313936eac2944df9ee2095d7f3b4436ad368ab7491)
            mstore(mload(add(vk, 0x160)), 0x126eb9f99b5ec84ef9bcbc7c5a57dbb0a0f9a108edb51b98afa9c06090ba5e53)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0a8d881f16d4a2eb9cb4d9ad35eab95cbca0bcf9f37d8c45e1b71a7394430c05)
            mstore(mload(add(vk, 0x180)), 0x28275156dc2830093090dcdfd84ca7de6c32951bc8090358e2400c5e0fd318ff)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0c99a03aab57b6ec2ad4317b10bab925dd8180bd37a38b28167bd387833cc305)
            mstore(mload(add(vk, 0x1a0)), 0x0c5a55334e5f488c8c8d0b3a570d4427f5d6270fe9ed7c2f372a997afbe8df3f)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2c152400afb3d41599e7a760ef2bd44a4cfca97f8d7375eb50664470bf90628d)
            mstore(mload(add(vk, 0x1c0)), 0x0d1778269b54ec38bafd8448e85469acf21c56fe52072d12ddc5519ff0ff929b)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1b13450aed355f85cddc35c3517baea1f0c30780b948c302e9dc781e0843cff1)
            mstore(mload(add(vk, 0x1e0)), 0x2c1e3dfcae155cfe932bab710d284da6b03cb5d0d2e2bc1a68534213e56f3b9a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1edf920496e650dcf4454ac2b508880f053447b19a83978f915744c979df19b9)
            mstore(mload(add(vk, 0x200)), 0x123e690dd753c7a133628947416d2763b11e6611e9f84a2d6806884ef30adcfa)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2ca133f04ad92a1a6011791c68cadb450df32f4c4def0fff9a1d79da2c193bb9)
            mstore(mload(add(vk, 0x220)), 0x03ce75b2d7b5fe33e7fc4e5d6a9c280c7e85919179a3ba684c081bf55ffcdba8)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0ed6f6272716c696d4337bf6d22377d61e005e3e14824a176d2c181738ad55e6)
            mstore(mload(add(vk, 0x240)), 0x02df19b2aef05e0654941a7e47b38a1ff144f37801b0f055761f980a8dd1a632)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x06eb38abb255bb5dbc37e5f8465453488535b01fbc4694384c591c4abeb40c6e)
            mstore(mload(add(vk, 0x260)), 0x02c13a0286eb35ce560a2477032ab4939d32a0ea33a16d2c353c7abff58dbf93)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x2d7af8d128b8f8fbef65cadd8c129f3393485fb2b7d88f7618336defd35b52e5)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1550) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

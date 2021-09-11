// Verification Key Hash: a4b5023e87903318d046a12f0d65aeee0220829d962b4c6980f7fbe21c69dc22
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
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0c52d37254d152060e40d2cf828e4e672591c1ab7601a6d6c3d4571acf0e0274)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x117a4b450544056900a048d8b362954090d506579a1257f2ee38932d6244ed08)
            mstore(mload(add(vk, 0xc0)), 0x2ab036c1034cf02a7bd39ae221436cfd9416acd711489087e9a42c27b2637ad9)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0535aea28f828b6b5aba4f83a5c77f9c8c9ea03e87ec08daff4ca455c35e0510)
            mstore(mload(add(vk, 0xe0)), 0x21176a9d38d382070699033a7a7e9056b531e2c8935a8e71a19356dc64be20d8)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x17961b4b157c968249256e38f6ee8d29a7c2ca252971b3c21b491831e2a52e03)
            mstore(mload(add(vk, 0x100)), 0x0bf4d44af05ee45390577757c78b836ee361c68aacb5fb75684836832ce88077)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2359fba000635315d50a282b44893d8876b74218f0645101c4530b091f435a45)
            mstore(mload(add(vk, 0x120)), 0x159c4c5e3a6c5138de3fd5539a41432d6d8659fc2f40dc035c2c6ccb8f922f87)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x12dfcea29cb3f71ab875a597680169fc646cda185e7a60e6f239686c3ab953ee)
            mstore(mload(add(vk, 0x140)), 0x250d255824b1b51a81d532150a2dc21feda0f0178576b5b44e7b6b3d4e7eb97f)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x27bddf0965dc89e40d56370d632e1ac82b5651d1be801de37f308a5fde5ac5ac)
            mstore(mload(add(vk, 0x160)), 0x182631b8e2535faf3a57d33769935ab9e2bb7d69a9e2817c87b0bf2e30cc7386)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x01ee3b04d17a914fbe17bce7539adafbc263715e49d986f09f5f8dea2be606fa)
            mstore(mload(add(vk, 0x180)), 0x276078a716fb117959436d35e3a0bdecbfdde0e4b623464b7135a66bfd9f9298)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x08510c558ada559f46af97d498e03be6810f61eacddb3b5c0dbba414d33e64b9)
            mstore(mload(add(vk, 0x1a0)), 0x084bc0d766a44bc4189d9bb93767ffb29a2762d4b73bed80f71e7bb3ea84fc4a)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0c6de121bdbb06e6a416a623cadd8d9f1ca6d5be4df2e46f1cfe7a58d829eb11)
            mstore(mload(add(vk, 0x1c0)), 0x1c16c14eafe6e91cd2a68f86fc9451bdc9d27cc32e9802e88c18e2f0d7f249eb)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x18a2b32865c941aaf169cb64e8046a0de450f5b546fb804a3603a856c8ee07bc)
            mstore(mload(add(vk, 0x1e0)), 0x2f09ebcfd21d933087339b1fc681d58d73cae4ae144d9a2c35ddc9cb9c69fd43)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x149849021d064a3084a7e8485e737e063adf1d359ea5114de107c4c3c76c2532)
            mstore(mload(add(vk, 0x200)), 0x25d220396b8016477a6a9715509422cceeef6d087cb77bdbd96838eb759bf841)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x147b7afd7a1a69323495b95782f0ab21869c671191c1c777d8c73e77259fafd2)
            mstore(mload(add(vk, 0x220)), 0x204769f55e53cc45929ddf6ecde231dd7d679ad14c7c8597af2c7d43db42fa5f)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x080548a3706221eb40919f98d31b936c18f0575cc03417212c128cf3f891201e)
            mstore(mload(add(vk, 0x240)), 0x1d08f02b35ad37fe9126fdb9125d414daf92c11f1537629d0b129852074e6fbf)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x25901a32e909e80fdff1d1d78a3165c6676521560d01394cd9e74f0774f81cbc)
            mstore(mload(add(vk, 0x260)), 0x17266ab70c9feee0f8b9c8b2667ce46a58802fcf9478baa00bf67407d1c2a93a)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1a1855f5a30a01fb9ba57ce4301e48852f9563e31b700aa814d45f486f9ccab4)
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

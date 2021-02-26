// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x8Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 8388608) // vk.circuit_size
            mstore(add(vk, 0x20), 3102) // vk.num_inputs
            mstore(add(vk, 0x40),0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d) // vk.work_root
            mstore(add(vk, 0x60),0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x271c8cb8e0353266e1b74ffd052f437ee970344b3bdba32d27b9daf7340ea299)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1972386c6c93a7dc405e8aa41c07e415cbaecdab6ef278bf56e01b10c5cd6438)
            mstore(mload(add(vk, 0xc0)), 0x132fedbea05df3d7d1c0afa5ab731d86dfd3adfe78e8f401538f5c655e7d12b5)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1058e36c5c3b214839d05d131a274a3e240afb6d0e8f946b0487ba4500b71d61)
            mstore(mload(add(vk, 0xe0)), 0x2675a1f967a193dada2cf858ace1771456439a18a7ff46f83428913dd1c8ef9f)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0cb5764f9696fc4c48e3171b07ae283028190345113e6d5065e188d1d0535555)
            mstore(mload(add(vk, 0x100)), 0x03d71f3e7461474b63cfd70c06c6d50fb63a6a560fda67219a9041d6440126e4)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1aab392c78d3b30855a8d83c8c109156d5b0a9c6ceda729cd6292b613b7b6814)
            mstore(mload(add(vk, 0x120)), 0x0008bd57186e441c757eaad814dfa072bd8d32c3c6e5b94c2166d4b6a9118132)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x16721486092ec4b32de8096285900fd71fd2ecd332ae94c9f91ddc3d6d12322e)
            mstore(mload(add(vk, 0x140)), 0x033b10c9cbe2a07e6b8660d3892104bfdcbfb466113a65df04f1cdd9dbf321c7)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x03d8a20875656244cbbb62362fe3fbda0172f8e6c452f521249f9ae10eb7f064)
            mstore(mload(add(vk, 0x160)), 0x158472d5aed61d16cb9c30e637fe1d6082481164aeeffd08eae6213f4e5f5789)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x01c508193dee652accfe34bdb72c075c2ddf62de30d2b7df03f5016029142b04)
            mstore(mload(add(vk, 0x180)), 0x1435fa496fe410c306fc9e7d06083a9e5dd1fb4f65d50d04ebb62da395c1d65f)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x160dea7c98413a14541a89d19537d2339efd30bffdcbb745fdc23caf98eee987)
            mstore(mload(add(vk, 0x1a0)), 0x086aaa1bb2a062a1b573ebde11efa824d726e79ab297730f5d1cc5ae1e8fc340)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1604dc65788449a4ab7d5fc24e750ce8eff78c4538a336081fa9189782426af7)
            mstore(mload(add(vk, 0x1c0)), 0x2f1c19b03c877d24e2218e69ea277abb9acdcc52b61ae2986a39fa965c5124b1)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x29ab90a6e686f76b260cb704d3a379236456265988f5dabf7e09861b4c6acf2d)
            mstore(mload(add(vk, 0x1e0)), 0x187a072c1ce40d52210a457d4b68cafd62b5a7fb7209d29172b0b4b7751e437a)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x20e843404de170e738192f703e56ec543d21bf911981279d9a76cbdd70c01530)
            mstore(mload(add(vk, 0x200)), 0x1ef84519690456361bce5d972e244768f8d5fca3768b278ad9164e5c1f58b7b5)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2851e50aa41328a7e43732dcd18036b218d6c6f7c1c7f5a3abad2972359ae570)
            mstore(mload(add(vk, 0x220)), 0x1f5caca8b1c5ecb875c4b6560655d4e4c5c828bbb487e287726ccd01e2cd4749)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x20d8df59ddc0fc47849d8906ad42fdd1dbd0c2334f991ce348bfbdf8a2b6a89a)
            mstore(mload(add(vk, 0x240)), 0x16d3cbd14cef190c1c98bd99d5099f1c6dbd0a1581a202501e17280e3c7a90b2)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x04320127ea4fa947a2ebf97824b292091df95176a6a96f5a83515f20cb69bf21)
            mstore(mload(add(vk, 0x260)), 0x1634d869acbfaf37d0792a570e0cfaeacb73dab33ba926f4c516a16e6ee2d685)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x25816e48fdf103cabac4c88f2bd3ed4087afc18b6df8a0a8fc76ac4ab01fab73)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 3086) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

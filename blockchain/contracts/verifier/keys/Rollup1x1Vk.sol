// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x1Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 1048576) // vk.circuit_size
            mstore(add(vk, 0x20), 60) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2e1fc54e519ffde238dfdc65a5fab510228c868488ededd17d701577ad202fc7)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0d7d5dbd54c7642782f8f566531d33e2aa7468e3b635b6ddbdb478c3bf94d4a5)
            mstore(mload(add(vk, 0xc0)), 0x1cdf9a66812d469f2fa201522366560a2b96051dd0e46e4be81b9efbc56003a3)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x24be95da8e521b3adec1ffc903a19c925f21564d363ab7bf9f06a2e456d08d07)
            mstore(mload(add(vk, 0xe0)), 0x1fc6ce22fb4bf1407eb63498ba3785096dfb16ae637b4da455da38ea1da4783e)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x12ae493dec46206d4d68b11d8a55eee2c60b9d76258c458b76ee3ce74ba13eed)
            mstore(mload(add(vk, 0x100)), 0x06bf1814e409a247a433b0896a9e3e3abf15a3355bd2ce41de6d6a1168e5aebf)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x2b4e878f17dbde558d0a2c63c89943851de6e75970c87658741216084345e591)
            mstore(mload(add(vk, 0x120)), 0x1c8827bb01f8da75a00d1fabc51539f59045ddb6844d144ef2230ef9ddb69537)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x12eb788c0bd61d1af9c117ff5a3206806a93c072362bdee1017ebda459d3ffbb)
            mstore(mload(add(vk, 0x140)), 0x23487179d9dd725cf3434b17e04423a701940e0b1fe784dceb05c90247159c85)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x06cadbb2f243186962814e5243d85db1382a929e9d60babeb45001361f6808fd)
            mstore(mload(add(vk, 0x160)), 0x2d99ab1a8c6cc59adb5db1907eac16851c319bf306a3721bc92f18024b9e328b)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1f7960e832f208b91476fecea7692626674ab01c54d9d9187923b330401f72d4)
            mstore(mload(add(vk, 0x180)), 0x0bd223c7d9c080fc9a3840a699157633c3a63fe3342c770d65030fe6ee7e8f65)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0f6210d88c9cdfc9514a2a4ac7b790d9326329c215fd213d67733c9612a863ce)
            mstore(mload(add(vk, 0x1a0)), 0x07ed814583fa7a15a1eb6b7ae4715b91f55b8924aaa60b098bbc9d8dcf721c68)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x288f2154329811aa3af663e12387778f0771629d9c627a06be58368b2b7d7589)
            mstore(mload(add(vk, 0x1c0)), 0x28705a82492669b65f6a24cebc39bf539569c7efeb3ddcf56b481d4d57fe8f40)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2a152bd7f124c32ab05fd34af3fe8c7431daa86932a149e9b548c5660014b15f)
            mstore(mload(add(vk, 0x1e0)), 0x2155722a8ecbfe371c014e7004cb028514b7da3068a339a490ee35a0158cd624)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2080ee072a59916607ea82c049cda990fe11f86e0015f6ee732c5bf6afc5f859)
            mstore(mload(add(vk, 0x200)), 0x123afe50ad97a90d5cb7d018bb377eabbf5885dc427d00947799f31a6911bcd1)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2816be8c0c198adbce03f77f7a4aef7acea5182d00b7da9c14b2275cb11fdcc8)
            mstore(mload(add(vk, 0x220)), 0x156d92deb18fcd6a5b583948ac00ef6c4840a95ab6288af1c9058e5df9b46afe)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x168092aa2250df111f457a6081b731c297bd5da85d83b09b8b1b25b4b1fb80ea)
            mstore(mload(add(vk, 0x240)), 0x175080296d3724c9f77e10238cf047c5fd3ba38fb723dd0956ea63b4dcded6ec)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1e9bb3ba3c6bce94112df57ae6d2388c7caca680b565b281126256cb417a7f8b)
            mstore(mload(add(vk, 0x260)), 0x296776f86fcdebeb5fc68e3c31a6cf9a7c2229aaf483130fb5c02fc9ed64bf3e)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x20779af65de0a583ce83f2168b33e2a942fa207e6f844dbe3510f8886c834b7c)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 35) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup28x8Vk {
    using PairingsBn254 for Types.G1Point;
    using PairingsBn254 for Types.G2Point;
    using PairingsBn254 for Types.Fr;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        vk.circuit_size = 8388608;
        vk.num_inputs = 3102;
        vk.work_root = PairingsBn254.new_fr(0x0210fe635ab4c74d6b7bcf70bc23a1395680c64022dd991fb54d4506ab80c59d);
        vk.domain_inverse = PairingsBn254.new_fr(0x30644e121894ba67550ff245e0f5eb5a25832df811e8df9dd100d30c2c14d821);
        vk.work_root_inverse = PairingsBn254.new_fr(0x2165a1a5bda6792b1dd75c9f4e2b8e61126a786ba1a6eadf811b03e7d69ca83b);
        vk.Q1 = PairingsBn254.new_g1(
            0x0172a6edc7d2f605e20813811a3f627cc2e55c2555c1951242858c4b8c074eba,
            0x10d7e9d748d1960ddd9bbcf2eb3ab37fe2850695f46dd9b34a7a26af5fa9503c
        );
        vk.Q2 = PairingsBn254.new_g1(
            0x2f46f558599bd08f3c234f0ecbf05e8e49d02cfecb0986339e9b273c12d6abcd,
            0x02a2434855ffac5b29f11518fadd0d021066df85ee29b039b7b333e629840447
        );
        vk.Q3 = PairingsBn254.new_g1(
            0x2675a1f967a193dada2cf858ace1771456439a18a7ff46f83428913dd1c8ef9f,
            0x0cb5764f9696fc4c48e3171b07ae283028190345113e6d5065e188d1d0535555
        );
        vk.Q4 = PairingsBn254.new_g1(
            0x03d71f3e7461474b63cfd70c06c6d50fb63a6a560fda67219a9041d6440126e4,
            0x1aab392c78d3b30855a8d83c8c109156d5b0a9c6ceda729cd6292b613b7b6814
        );
        vk.Q5 = PairingsBn254.new_g1(
            0x0008bd57186e441c757eaad814dfa072bd8d32c3c6e5b94c2166d4b6a9118132,
            0x16721486092ec4b32de8096285900fd71fd2ecd332ae94c9f91ddc3d6d12322e
        );
        vk.QM = PairingsBn254.new_g1(
            0x033b10c9cbe2a07e6b8660d3892104bfdcbfb466113a65df04f1cdd9dbf321c7,
            0x03d8a20875656244cbbb62362fe3fbda0172f8e6c452f521249f9ae10eb7f064
        );
        vk.QC = PairingsBn254.new_g1(
            0x0dfbe0d3e25c845b921c6e1e8002f548038c0dab6ccba9072a6a95076620a793,
            0x193be32cbd85c29b8322eeeffe4fd27644071718e4b154199833ff8278497f61
        );
        vk.QARITH = PairingsBn254.new_g1(
            0x1435fa496fe410c306fc9e7d06083a9e5dd1fb4f65d50d04ebb62da395c1d65f,
            0x160dea7c98413a14541a89d19537d2339efd30bffdcbb745fdc23caf98eee987
        );
        vk.QECC = PairingsBn254.new_g1(
            0x086aaa1bb2a062a1b573ebde11efa824d726e79ab297730f5d1cc5ae1e8fc340,
            0x1604dc65788449a4ab7d5fc24e750ce8eff78c4538a336081fa9189782426af7
        );
        vk.QRANGE = PairingsBn254.new_g1(
            0x2f1c19b03c877d24e2218e69ea277abb9acdcc52b61ae2986a39fa965c5124b1,
            0x29ab90a6e686f76b260cb704d3a379236456265988f5dabf7e09861b4c6acf2d
        );
        vk.QLOGIC = PairingsBn254.new_g1(
            0x187a072c1ce40d52210a457d4b68cafd62b5a7fb7209d29172b0b4b7751e437a,
            0x20e843404de170e738192f703e56ec543d21bf911981279d9a76cbdd70c01530
        );
        vk.sigma_commitments[0] = PairingsBn254.new_g1(
            0x1ef84519690456361bce5d972e244768f8d5fca3768b278ad9164e5c1f58b7b5,
            0x2851e50aa41328a7e43732dcd18036b218d6c6f7c1c7f5a3abad2972359ae570
        );
        vk.sigma_commitments[1] = PairingsBn254.new_g1(
            0x0f7c09a998533e3fb3f4e72303608809527d9abaf226e78a0b597fa1115db074,
            0x2336a03e26f27ec503b86f681d4a6061f3ecd28cd4c20759a670c546a151972b
        );
        vk.sigma_commitments[2] = PairingsBn254.new_g1(
            0x139b95c91e082cd4958f66b7010dc810c18ef3f1acba8f2c98f28bc6f5283ef1,
            0x2eac5a7b8d9c89f460df06ad0b6aa96316865762fffbbca62ed71cca2f3806db
        );
        vk.sigma_commitments[3] = PairingsBn254.new_g1(
            0x25b0d52b5c0deb48bb5cc8864f2d11b9419323b4e65ab8a57cd6dc0ba17abc28,
            0x101799f2609f42425e815e6f8b891e93759ad8f269a955723cb430d1101e532e
        );
        vk.permutation_non_residues[0] = PairingsBn254.new_fr(
            0x0000000000000000000000000000000000000000000000000000000000000005
        );
        vk.permutation_non_residues[1] = PairingsBn254.new_fr(
            0x0000000000000000000000000000000000000000000000000000000000000006
        );
        vk.permutation_non_residues[2] = PairingsBn254.new_fr(
            0x0000000000000000000000000000000000000000000000000000000000000007
        );
        vk.contains_recursive_proof = true;
        vk.recursive_proof_indices = 3086;
        vk.g2_x = PairingsBn254.new_g2(
            [
                0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1,
                0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0
            ],
            [
                0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4,
                0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55
            ]
        );
        return vk;
    }
}

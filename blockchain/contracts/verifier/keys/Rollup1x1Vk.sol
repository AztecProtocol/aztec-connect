// Verification Key Hash: 8228929833e4cb78c2f2e220f393ef6a44c7ab21f9cb0f640bebe75d162e087b
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
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0c71b69236a25f1c5bbb82ad365d1e6a5cf09fe06338db42d0793a2ce0bcf0da)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1f5487d2d0eab58d722ce866ce7004efe1e03aee7714210dda95afaa639a7a11)
            mstore(mload(add(vk, 0xc0)), 0x29b6a5d7c71a2a6ae64233b74cd690bf36f57bc1428d4b9dfaff7389aa40fdd8)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x0af8e4bd2818bdb0b623f099dc721b0438d49640d9848939a655de34a061d696)
            mstore(mload(add(vk, 0xe0)), 0x16519bb5fb3c004cff57cec710a95cd096d27668e5ce7533caaaf2a648656903)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x09d75f1a92b0e8a0b5c3b7e75ca46336ad75ecdaa31331dd7d2a661fdae26102)
            mstore(mload(add(vk, 0x100)), 0x1ee5e0a58761f8307f8f1b96858f9957f7e5b56e8ec84031263eba805635b70a)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x194a4f6ffac8c433aa6b7ce102941807feeb58a98be7079ea01fa024fb86b4e4)
            mstore(mload(add(vk, 0x120)), 0x11e6122abf350578c6acddde6303dc0b189cff43df221b3ad5276eeb81cd2ca1)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x23946cd0c02365f996afdb998cc3f3f1ea8e9216c08349987cccc0c6e8148503)
            mstore(mload(add(vk, 0x140)), 0x059d4420bb906dbfd2b47dead2ad178b4fca51a8ea664440d6f7c71f1acbc004)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0a505e90e3ad2f5e02f45e26419910aa7d65c057c7cf9d3d631fa10779120f6f)
            mstore(mload(add(vk, 0x160)), 0x250d39b0ad38294ff1a2bda45d806945b697b106826cb8aa492bd80f3e88c797)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1d25ad3f12be141b5fc531a7315aad922135ae337e8158428a5278f9aed716f1)
            mstore(mload(add(vk, 0x180)), 0x287c5dac1686aef736db0043073dec7b21ff9d664a0bb91e6e3d7720b4b48427)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0ce8575f905d3e35d7225b336210bbe5f2838403fcae4df03dc8fc8959f96255)
            mstore(mload(add(vk, 0x1a0)), 0x288c43b5d717a687599d2b605bc52790be66e7a3e4bf09104d4f4b00bfa7e6e4)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1ff8e2df01a9eff5e9824cea9e3172bf87682f90c42c4e9daa9f0eb8fa8516f9)
            mstore(mload(add(vk, 0x1c0)), 0x1ded2f8623865b072ba18fd724cf5729c115be794804d67d03617a3dc3a5e546)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0bff10977027f951f8a3914d1d322ff7a8e1ce3f18982a43403171d60b9e7b07)
            mstore(mload(add(vk, 0x1e0)), 0x0148149361246420a349812702924046658eb9a1ffad4496ba1d32395ad3378b)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x01a19b443c082e97e05a4597b3425d1a24651c8f0c40c98a598723b7345a0ba2)
            mstore(mload(add(vk, 0x200)), 0x2dc36426c74a83473c9badf75fe4fffdf348af62d6996d5dd7037915756e72d1)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0cf9803c69f7cadb1e67881b31a0077e955bde150925c757bab5ef51393b9161)
            mstore(mload(add(vk, 0x220)), 0x2254d74c588fdb494bc7c311e6280341b16e7e6fc392c2a641d0ff54a1d14b93)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2adcc11f08a78b0450bc98ec26728f8e86499f3e3e1095257ce4a9bb6791501e)
            mstore(mload(add(vk, 0x240)), 0x2c70f270f9f7fab7599fe4e902a744c8e6c257e090638a8304d0d9745c2931a1)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1b31d8274c2313baaae3667390d3dd0e08f3fd94303717f75240daa918944ff1)
            mstore(mload(add(vk, 0x260)), 0x09e96d9162d36e378ff0517faab19ab69450fae87a82dec26a53b1977e7bb086)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x07fadce2ee4fd1ef72e979d91ba4b63781e85f6e02f07322c6d2cb05aa95fb8d)
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

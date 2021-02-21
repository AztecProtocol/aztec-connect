// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x16Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 16777216) // vk.circuit_size
            mstore(add(vk, 0x20), 6174) // vk.num_inputs
            mstore(add(vk, 0x40),0x0c9fabc7845d50d2852e2a0371c6441f145e0db82e8326961c25f1e3e32b045b) // vk.work_root
            mstore(add(vk, 0x60),0x30644e427ce32d4886b01bfe313ba1dba6db8b2045d128178a7164500e0a6c11) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2710c370db50e9cda334d3179cd061637be1488db323a16402e1d4d1110b737b) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x12183c8c705b46c10ac298e6e9801ad05dd8d1c00fd2903efedd051cec3ad784)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x15aa8c27ac130bb3577d653cf36b8b6fd0c8a6714b4575cf98035b628fd7e129)
            mstore(mload(add(vk, 0xc0)), 0x2d5c81c5b2dd3f39e8217509229ccbdbaa94c13f1cb1f71fecca2c888a914176)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x043b74ca202d219e248994737b75503a917004fc4fa420fb277192cb006b8f29)
            mstore(mload(add(vk, 0xe0)), 0x0a2c8a18e623451c12465e2190b0bd3d16ac3404569aaa0aae4e8097ead009ab)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x028129f90dd50b4301a750400eaa41e9a0e91bc5ccb01a081ad78f59d2aaf34b)
            mstore(mload(add(vk, 0x100)), 0x29a2479e6ea4daf56d6c4b6dac6d0e506ab53cb21184404a0e00be17bc83ab4a)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x138b5dfa6ddff36b7fa3beca00c7e13b69493ef3da03dc7e6400248cf103273b)
            mstore(mload(add(vk, 0x120)), 0x1cadf2dd2337e33195c7ef8a061ec21b07d19352c433b221167597344c4c65c8)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x18ac80b2d5dc142792422cbf28bbe44723fca8fdfdbf0469184dc22dbb5e4d8f)
            mstore(mload(add(vk, 0x140)), 0x077e80efe087ddd22b06f5eb457019d9acde4a62e02c46c404afb91442a3ce4e)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2bf3cc08e50fa723e1b21e548a9cb30e8655ea01a692452c7a93af750a4069aa)
            mstore(mload(add(vk, 0x160)), 0x2d26c5746300b90268ad00d88e8077ef7dd4d1bb7e9430f89537416fbdc58b7f)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x22ba0236fce5980b281c478d82a9f005c7b808c2e7246ab8fd34a9a7f45d164d)
            mstore(mload(add(vk, 0x180)), 0x0173a6d8fc0a790df84404ba9bc82a13ad68adbaf329ba7b175b5fd768f7a12a)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2fb6d546c3e8045e2c6c9e6b8b071089829637bb45348a40bc2bc88190453152)
            mstore(mload(add(vk, 0x1a0)), 0x1d343b603151ccb0348556450eb83234037bc3f6294cf0d8d08039fe8241afc5)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1051f968307fca55282cd2260369a30aef2904677f53a3af2b55fff36f254a57)
            mstore(mload(add(vk, 0x1c0)), 0x0d543617915d41ddca7f5017f91dc089e468b1dd5f8aac94999dc183bccfd5f5)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0007e59ebeed62c41801aa4dfaf501006b68c5031dadb22180e6dd33b1fc69e7)
            mstore(mload(add(vk, 0x1e0)), 0x003165d428c6e052580b2ab7ba4519222799ed066afa052f742e0d109b179f19)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2b2371ed9b653986d0bd0802b55f855531c23b2a2693cf63fc031f7a12966d7c)
            mstore(mload(add(vk, 0x200)), 0x1d24cbf33ac23f4e3ef652bdaaceb9508f1f261e88c0b719ec14e6d9905c3584)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x18cb7b7a347d8409a9e0efcc86db390351f92ff3806201b48c7d9fd6b4a5b437)
            mstore(mload(add(vk, 0x220)), 0x0fbb0a15bd97b0adb04c852fa9cb136170560c80701d42f0cb925134592704b7)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0b3f7ead501541ad068a2272370b16693003e2a2b82fa72972689a275af24176)
            mstore(mload(add(vk, 0x240)), 0x23378826c9dc72feba80f1b6bf3599750aa52ae83a9cbb07c556a479088cf26c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1b52f15fed69aa2bece7335444f361d9691cebd81384a71e1015549a5ae3b7a7)
            mstore(mload(add(vk, 0x260)), 0x2be33142cc9f4ef65ff332a58c23b323a11a8d48f1e4eb0b90e3f522f52abbef)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1e98520ad56546df2bf8c4d49b4863df99f8769c8c24d153f00c2843e89a9c50)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 6158) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

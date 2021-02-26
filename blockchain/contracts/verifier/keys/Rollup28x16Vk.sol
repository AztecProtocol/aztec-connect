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
            mstore(mload(add(vk, 0xa0)), 0x225613b5b81f2763475798b632b85f387bd8ccb95ad5af90925c356f6e14b038)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1b3ddc306f9c5bd54d6f91a8b37fc90bcb3f1002284ff1e1729f0c376839b89b)
            mstore(mload(add(vk, 0xc0)), 0x0c974388444a9227d576dc757ffbdb57940316cbb6361f642374614b21355b30)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x27d04dfe8ad958331cbe4ac6a013be21fb60822b97252bb8ae173a8c2e4aee0b)
            mstore(mload(add(vk, 0xe0)), 0x0a2c8a18e623451c12465e2190b0bd3d16ac3404569aaa0aae4e8097ead009ab)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x028129f90dd50b4301a750400eaa41e9a0e91bc5ccb01a081ad78f59d2aaf34b)
            mstore(mload(add(vk, 0x100)), 0x29a2479e6ea4daf56d6c4b6dac6d0e506ab53cb21184404a0e00be17bc83ab4a)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x138b5dfa6ddff36b7fa3beca00c7e13b69493ef3da03dc7e6400248cf103273b)
            mstore(mload(add(vk, 0x120)), 0x1cadf2dd2337e33195c7ef8a061ec21b07d19352c433b221167597344c4c65c8)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x18ac80b2d5dc142792422cbf28bbe44723fca8fdfdbf0469184dc22dbb5e4d8f)
            mstore(mload(add(vk, 0x140)), 0x077e80efe087ddd22b06f5eb457019d9acde4a62e02c46c404afb91442a3ce4e)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2bf3cc08e50fa723e1b21e548a9cb30e8655ea01a692452c7a93af750a4069aa)
            mstore(mload(add(vk, 0x160)), 0x13eb9b2713e35a1ffd987fed4fb99036bf5ed8fdda9158a9f6ed29ffc4cc112d)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0444c99825c737e6cda96b5f035d1bb8f7c99df776075dcc489d7478ad036b1c)
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
            mstore(mload(add(vk, 0x220)), 0x1ff115fdbcfc375ddf7a01251b30ac0f4b530eb7be0724860e8754dc3e5b4a1e)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x15bda12bd36bfcc548a8d63319055333b8c33cb145357494d83784ce4701b873)
            mstore(mload(add(vk, 0x240)), 0x138d5f013666510737b0baa4d10c386f7a44e0dd4d35508ccdf9cd86da7a7423)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2d763395ea934c56a0607e293be42913433d31676df8196a523582f27cf6f42f)
            mstore(mload(add(vk, 0x260)), 0x141c8bbb9662f5259989a6aab008daa300310da8477f99a826e3e89642dda83d)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x047a64f10308552c3240962e2ea1e4e78f5041514ebdd47c2fef436d374955a1)
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

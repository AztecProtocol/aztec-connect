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
            mstore(mload(add(vk, 0xa0)), 0x0aa240d4e4310229758cafcdc3cbd9028785ca59e4d95b0dc5274f763ab2d65c)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1591723f1d3af61a9304a64d333d4af18fa3d5bc7384ee0d412b223449cb5b9e)
            mstore(mload(add(vk, 0xc0)), 0x0bbf1e7f94f329ee0d764c150ddb11501918ad2609629aeef42816a3b680f22d)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x06f01eba6eef047a81d8038cf1accac22e033cc4111c7be4adc1a67b86185f3f)
            mstore(mload(add(vk, 0xe0)), 0x17e4bf87264d4c29ae812d7db91860e6c7da4e719c01826f70ffc3e5d89cc889)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x132a0cd559c88feea3a87c405ee08b23f0ced8bafc6ba677b2d59912131af931)
            mstore(mload(add(vk, 0x100)), 0x1ea32a1b3d9b3377bfe44f40a3ccb107268bda64055fc09acc4f3e938179431e)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x20fbe7b4c2be57ded3ba772f6d9352a033d0b49862aaaffbf94a627603e4996f)
            mstore(mload(add(vk, 0x120)), 0x2be20e4b466a919bba5e3147ce35d3be0bf6888e0e0607c689ca5f8c68f22ea9)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0b376226dc15a0cde65d95424b8e1d204d7f7d45f239f39a53a82e396dad1c43)
            mstore(mload(add(vk, 0x140)), 0x0e91594061f7f34aadb70dc16ae87d7238240f1fd6b899bccab7b95b3009e99c)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x2768590ffd51eae521658e6b5394cb0c24ff314eea7efa8caf4f3e591140ef81)
            mstore(mload(add(vk, 0x160)), 0x112f034f6225f430c7af0535f79de5328c3219c796accb6806b1cca862d5584f)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x251a7271879182d191c2623b4d1bcabcb4fc569ba2ff90387ccda6fe898d3009)
            mstore(mload(add(vk, 0x180)), 0x0bd223c7d9c080fc9a3840a699157633c3a63fe3342c770d65030fe6ee7e8f65)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0f6210d88c9cdfc9514a2a4ac7b790d9326329c215fd213d67733c9612a863ce)
            mstore(mload(add(vk, 0x1a0)), 0x09451fbd61a39fabf9609870945b38c3c6d9b74eb351655fb53a5ac3638a073a)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x20912b19939a03a1f472b97351292578af32d0bb48e1cb998c31cee0431eb154)
            mstore(mload(add(vk, 0x1c0)), 0x28705a82492669b65f6a24cebc39bf539569c7efeb3ddcf56b481d4d57fe8f40)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2a152bd7f124c32ab05fd34af3fe8c7431daa86932a149e9b548c5660014b15f)
            mstore(mload(add(vk, 0x1e0)), 0x2155722a8ecbfe371c014e7004cb028514b7da3068a339a490ee35a0158cd624)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2080ee072a59916607ea82c049cda990fe11f86e0015f6ee732c5bf6afc5f859)
            mstore(mload(add(vk, 0x200)), 0x123afe50ad97a90d5cb7d018bb377eabbf5885dc427d00947799f31a6911bcd1)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2816be8c0c198adbce03f77f7a4aef7acea5182d00b7da9c14b2275cb11fdcc8)
            mstore(mload(add(vk, 0x220)), 0x0d0cdb7884539bd66490038ad1e1d575332c83ed89aa004b3fd9c03a15b40f37)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x2f8737abed95a5efdc6ab03ab46c5bb1ae1a7a787f059a03860bebf7ff1edc95)
            mstore(mload(add(vk, 0x240)), 0x0a5a4a825ff83bb7b1647be96f4fd6f981ae735f18387bb81cc9bbcc4224ee3c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1605a98a6bc2e15b39fa97b5c28b5e88137c76340bc79e6b53558e77f40d0760)
            mstore(mload(add(vk, 0x260)), 0x2f46da38954bdbaa4fa03270bb52d24ffd7307d231a57bf7ab773ac8d1f13831)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x0092940cfe258261cae2f551627aaea3b1efe3852690b6d2657c5f2ef6189c80)
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

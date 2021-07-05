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
            mstore(add(vk, 0x20), 42) // vk.num_inputs
            mstore(add(vk, 0x40),0x26125da10a0ed06327508aba06d1e303ac616632dbed349f53422da953337857) // vk.work_root
            mstore(add(vk, 0x60),0x30644b6c9c4a72169e4daa317d25f04512ae15c53b34e8f5acd8e155d0a6c101) // vk.domain_inverse
            mstore(add(vk, 0x80),0x100c332d2100895fab6473bc2c51bfca521f45cb3baca6260852a8fde26c91f3) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x01247a37abbe73de3b137cbc2b9c54c929f38d20154639341457c30aa65904fc)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x180be8e1a0dad7ff74a34ac79cbda6e7382b02ff2342d917fe72f59e59e0c29c)
            mstore(mload(add(vk, 0xc0)), 0x21cd979898a364b79b394f453d2ca656af1a0b8f7cbb7537f8ad164ad1e371ef)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x141d051cfa0383585343d240676addcb33b310c82c05365aa997e58e95b46373)
            mstore(mload(add(vk, 0xe0)), 0x1d982d43b761efd99e23fd4959fb72e75a98b35f5843cf4558335790fa56231b)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x29a9d45ca3830701f5c89f7489ce2ae010f8a5e7869cd1ac91e3fca0d34060fb)
            mstore(mload(add(vk, 0x100)), 0x067f8a49001b8fdce8be49da12b2cafd32bd83485e1b20ca95efb754fe5d09a0)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x12a84ec4fe97b2e622fbae1211b09ba049b49c03039470c7be7689260d4d8a41)
            mstore(mload(add(vk, 0x120)), 0x25b626f52395c4cb53eae8d8775591c0e2eb48aad8fd21e0adb7654b3705fb2e)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0a39292096816fbf51b3fb7601b1b17a2843bf138946c90baa852ae3726509e9)
            mstore(mload(add(vk, 0x140)), 0x27d85e7108fe41a35ef8b43f806638d7a6e1eafd09862cc944b85879a2e6cc54)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0b941c9773055677a4958c4b542f0018a1d05addc6e3b0ca263b940549441919)
            mstore(mload(add(vk, 0x160)), 0x1bf6e291eef6cf4538a9f7005c1d13d49ade45bb8ba7465fcbe4a8d50877fec5)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0cedc84b96d0a5ad12854c9dc3a23d8e0c80907d745b87f331265945c76c2430)
            mstore(mload(add(vk, 0x180)), 0x20f8063fe28fa57c7853286b0c50cb69121d38edefc335db1ec2c1fd9390cedc)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x256457771d406f2f07a551e377a0feda77f972973958acbf565099fb0c3ec5e2)
            mstore(mload(add(vk, 0x1a0)), 0x2943f89c9f42fd48ed6c223ffeb22266fbc485972e5da414a9d402d1175a06e4)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0b20dc7a9960354f9b4a694feeb4a0affdaa3f470ef2cf124dc3942f98e48085)
            mstore(mload(add(vk, 0x1c0)), 0x0b4ccdf7779edb6645a5f88bd24b6bc1b978cc3b806373c490260d74d4f8885d)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2a5f5690556401fc386379ca5911eb50101c1c5b88863ec326352cb330e3a85b)
            mstore(mload(add(vk, 0x1e0)), 0x20735c1704fee325f652a4a61b3fe620130f9c868d6430f9ace2a782e4cd474e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x217a0dc7aa32d5ec9f686718931304a9673229626cbfa0d9e30501e546331f4b)
            mstore(mload(add(vk, 0x200)), 0x118c4bcc4492580f5cb85ee66a50e039c48108e2b2b8a03516c6c929a3b5eea3)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x29444d507c139bb6575a2534f1f4253cf07745340945fe14e7141f0e42e731f6)
            mstore(mload(add(vk, 0x220)), 0x21438379d53dd999365a749932acad8bf8cfe66d02dc38a325262f63c0fd9f20)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x0c0a8adf8a990ac1bcd50dbf467236d2a6b6e61b8a90a40ae1024ffb600e59a6)
            mstore(mload(add(vk, 0x240)), 0x003a636d30942051c6dbc617d7de7e71673f868106df68cdd31297f5fad6986c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x081c7a5a5933bba036a8442f5b7f6e4c3a329ac73ce33d1d5bc1861ab7a06e5a)
            mstore(mload(add(vk, 0x260)), 0x1b2a284e86195fb034fe23126707ff11c9bdc129fb511249982ad163ec77b074)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x055942c8ec4c89c75d4ebb702ca95115cbb58928e44a080edd28ecfc1638d087)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 26) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

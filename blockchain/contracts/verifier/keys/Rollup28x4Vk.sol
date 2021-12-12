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
            mstore(mload(add(vk, 0xa0)), 0x00aedfd3673713c0e4185928880c2259b050bafa390dad1f5c7162296b77d309)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1d851124257daa8f8673424e3ef4908664e6a5f147a734a2a16aa4b134eb848e)
            mstore(mload(add(vk, 0xc0)), 0x16a847ea6a828a8d4ac9006dfb7cb6a8d3cf6256168baa82b49a4d15afbf88e9)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2686e71565f5ae835322b874dd4cfcd41690e76b1602a77a7b9643e0676e59a3)
            mstore(mload(add(vk, 0xe0)), 0x156e27ef850efff2fd85a0a08614a782dca765399e9415de201bbcf49a7d8842)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x039c03a3bc6147c0e44cdc6476ac26ec2832fd5c300ff2211d8f298c3403594a)
            mstore(mload(add(vk, 0x100)), 0x101c63ecb0e31f417551439fa5cf944905f857e85b8d8652a394e8247f06e5db)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x08b51a9d5878908c2ecf9b614abc2db76eba9e2fd744e1bf950f2085e48db650)
            mstore(mload(add(vk, 0x120)), 0x007b962b89d5c95d05f5e289b70c94638ee91f00639859122c5d306b6fab5b43)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1d9b4ce5d6111f2b6617afc15158713ccc5f7b473e3bcf5f81e739e1c1f6e5dc)
            mstore(mload(add(vk, 0x140)), 0x303ecd0abd791231be3c46932023d628854098599af5964744a0abbc34ab66b8)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x27a6a54866e70e5b26e9aa83b7a336ec496f234803fd4373f171fe2a47623db2)
            mstore(mload(add(vk, 0x160)), 0x0a8a5d12269ad92086c027b3b44f91077e950c281ae74e740c24a30a83f7f47d)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2b2189f1114cc98d1a49ed3989ace09ae0a639ec87eed20081e9170d36a650b6)
            mstore(mload(add(vk, 0x180)), 0x2046de2ec2d235b1eabe00f8efbb457d04cb397c3d08bd989a8b3d241e3ca34b)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2fcbe115a306ff18b86b237d2d42f9bddfd0576fa469d0ff4a4ce4d26081a466)
            mstore(mload(add(vk, 0x1a0)), 0x049a2e40de309bda195b9a9f4a75df8112b272f465c6e44b83fe8d715efeaac9)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1a6994863a80b388bd025afd8250ec18490b4f0e448ac2efe9e277bf57e4bd63)
            mstore(mload(add(vk, 0x1c0)), 0x0b2b5bf773e1e5e762227bb903da156673155f745a9c07e11b40042572a6ca14)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2f867fbe12bb998b8b6189123ace71d46d4ff5a5194fc4da0fddc188e16303c3)
            mstore(mload(add(vk, 0x1e0)), 0x2e4ef6c2eecabb86bd7420c3950c5537bd7e17ef76bd42b113f6af434d9042e7)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x11f5685959f6eff605dbcbd761de75d091a23aa24409edd48aca175ffd16ba05)
            mstore(mload(add(vk, 0x200)), 0x2cb9e48a5c313e4dd3b5b1e43aa43b1ab0a44a6f683fbc7698628f29106f4e3d)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0f4cd5c520af036ce10120dd52bd7979cf1e536d1b29b15c97a40a05b760b355)
            mstore(mload(add(vk, 0x220)), 0x034fce2e99be9afb219bbe2f7fd802d4cb40c9053415e71fe70ca3bcebbbfc1d)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x25cbb3eaea6d4324155a8ecad62347b7790fd1fa14c552931d8a6eb9bc18a364)
            mstore(mload(add(vk, 0x240)), 0x0c684132b19adc0370df75fc86235d3810e9bd70d5bc7f2f56c2e8ba6823d35d)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x07cfd8ca9c1946c6854882bb3af06445fede3ec3abc983b43d05415aa65ea830)
            mstore(mload(add(vk, 0x260)), 0x185a6bd652174af82c3b8db6f2ff319396e9924284321c113d0afe21dd6844d8)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x084362cf6768135357ecb9b3f1d113ecde4811079d98e4c1ae35cb989063fb7f)
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

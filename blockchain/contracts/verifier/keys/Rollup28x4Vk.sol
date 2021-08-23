// Verification Key Hash: 08a182e81b8535b1f90b4040854c90ba0ba66c7c3aed0c55b4db9e9c72fe1f06
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
            mstore(add(vk, 0x20), 1352) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x22acb0b518c7f5cc43c4bc2f50051945bf91fb3bb2b7cefbd94ad25098665fe5)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1a18bb2522ee018f96ae542b41dafd559383dd5b03460c3fa2a650c38e907512)
            mstore(mload(add(vk, 0xc0)), 0x2324d2e8214ec685b50c6cf31757e2998448a5ab889a0fc938ccf9edf4c05978)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x10e1293969b12270c63ae8821c10a177b9713ad4df7f3393b3f7b826910f3306)
            mstore(mload(add(vk, 0xe0)), 0x1ed145f1c8608ca5503cd79e94b54de9f745a88c89358c51094c6e74dfa202aa)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x25b1d1a3ae598ef22333e559d00b368082d81a7cd2ecd31e69c0016d8e0ec651)
            mstore(mload(add(vk, 0x100)), 0x23a7866bcbe32be932f53497da914b8d138893035b5f95c8bd56c784041b3666)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x11ac3d0dfcf97313aa6c6013c50e0918e56a99f02117da5229796440a3428198)
            mstore(mload(add(vk, 0x120)), 0x1c52adb85e3c85f85f808b4ba2566d7ee8338f8ec0a4904194c3aba1f6c69e64)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x0bc14450bdd495fc5cc6f1d2539273e8c1163054348978226373b81b2e63ed18)
            mstore(mload(add(vk, 0x140)), 0x14f63aaa99a1c2e28f3a85401233159a3ff1572ce7d7d1192e37c4aa0dc7acca)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0223078aad60c6a37aa64a5309ea5a710cb04541b2ac880847a3700a65bdb66c)
            mstore(mload(add(vk, 0x160)), 0x142b65bdec9cfd540f08cdeeba4c51047a8c2c94b888e6f7e7e298bd68c46f54)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x24d18cbdb5f70f8ef8a9cdb47fd19239bd8fa65ba7b4834887b543dee6e4bd5a)
            mstore(mload(add(vk, 0x180)), 0x0597162eebd3a9a259ba2257c956547d5ddbd6b1fc94236f1431695faf58d413)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1f2d087f7785a6db3659c2751b091df9eed2cdecd0a124ac3e4cc40cc14b2017)
            mstore(mload(add(vk, 0x1a0)), 0x16f1c2ab5c007902699ce5d09ab5d7d28e6358acebfb1fb08ca2b7680b77c878)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1857be18a02485bc043ba51e196bc1128df617b9495233a75637558e90a59cb6)
            mstore(mload(add(vk, 0x1c0)), 0x197508ea1c44f47953dadc7db8f4ba96f67523b1161449cc9d3de1662d6bf316)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1a2ccc3a76c24606ecdd1d18ba2d97719dab0f24fe3d70992493f20a3a62bbef)
            mstore(mload(add(vk, 0x1e0)), 0x046037bcafaeee835ce174162c71244d57a72a8563cc6f92c6d41ad76f0eeab2)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2d2553d8eceb012353de6ae57221b217f63687dadbaf617920be139e53351574)
            mstore(mload(add(vk, 0x200)), 0x06e46aefd90b1abae42c2dbd42a6258f9a57207fc27d74f603bb5801edaf6fac)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0d5a3ee5689d5b11f8d2ce5646da8b16d2b4cbfb5a8aa12eb06feb04c2011b75)
            mstore(mload(add(vk, 0x220)), 0x26f034f43ebc05e8afc64acb9246b6cb456904c1edc1b489f70c4d4cd5c7f20c)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x1166bb27fc6ec3903f595d863c4c606fee32ad9c3f77aff70c8a2460bbfc314a)
            mstore(mload(add(vk, 0x240)), 0x07f34729e347e9e963ca5aa8bd8beb53e62b8480c1b5993e7acec0df87a3ed23)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x2539be823f9a5abc808a03cfc99d8c4b848a896eaf959d32ddf9852e0ad7a7eb)
            mstore(mload(add(vk, 0x260)), 0x0c44ff387bd59088c15dcbaa2c89d8d72feda35700c651b221a16b782233dbd1)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x03d8091bc62fdcb73594686c4873112cafb48016407e5b78515554076d71d607)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1331) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

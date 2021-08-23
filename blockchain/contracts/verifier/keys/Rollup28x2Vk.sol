// Verification Key Hash: 156e31fe96fffa1bacbd763560c07383cf73f60b2cf5ecb883027eaae72641c3
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup28x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 712) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2739e91d0eecf8d05b869639b928dc5b6b4d38a66ad4b91423e55b78379a0df0)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1db04419391db3d4df7e8b6612b8b28b2b7641acd8a1acdc6880512a7e20ede2)
            mstore(mload(add(vk, 0xc0)), 0x0dcf774cb0ff7c70cd843a1ae0ec14d6fd9ce998005c4a0fa6bfcfd62eb8ad1a)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x17891b555dd0b42465dfccd36c0a49137b57dbfe250165b07eabaf4b4c536bd6)
            mstore(mload(add(vk, 0xe0)), 0x1c3f231528e7dbf483630e334df248be9a4bb27609a9a6285a4937b52b1542ed)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0960b8f55e54edfd0b45a151742e74e00bfde43c23b5c32379ce5c1a576b4f9b)
            mstore(mload(add(vk, 0x100)), 0x04ecc385cb857071d17e8ffeb44eb709a36f31d0362953e008f4b8baad947a23)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x15dab15e2ffc4182df6c005701a815c6695b70c6b87d6af32370a12c04daaa75)
            mstore(mload(add(vk, 0x120)), 0x139f16b5ffe7f59a1d2bab28e3622a452b27048baf1c581f6155f6d3ba73da82)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x29b1fae28f4c46acebd49e2e427a4b1aae419cc1f476ed5f2b4c7cacc3ae8592)
            mstore(mload(add(vk, 0x140)), 0x10922f868f18c2b12263dcfc1979cb10758db1ba04adf90c281ae3b9d8e2c598)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x291ac89f76819ca075bbc0a8ad89fedb211f1c4917a2723180e60315cd1152e8)
            mstore(mload(add(vk, 0x160)), 0x152d730b032a7fa7fb3dec73fd60801ccfd3b3ec5656df13c822597ea584c304)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0380e8571abdf8e00165029bf604cffacc3f61cf7c6f45fd279a9f4b7d5678b9)
            mstore(mload(add(vk, 0x180)), 0x2026988f626b06cc943f5d265528324bb68b4dca430eb0d9aea18dfa131c7840)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x11c83f025a702906f5c9d4672a1844bc7a5970737124bacca4201b724a915266)
            mstore(mload(add(vk, 0x1a0)), 0x1a1a1741bde30fd0dc5e1859f4a7abd98792e8b829fb4828d06156a130672e3d)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x182c98ae637df5d4e22ccd89cf0c0b6eeef07938f01bd694f9b9cf3e5bddfd94)
            mstore(mload(add(vk, 0x1c0)), 0x28ec99e4abd2409069e7c894dcb9c7682af457bc20bb89f207e61fb0730de50f)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1590db92d35ffc19e8152a7123eb21e2a06d63a4b196ecd7d8eb333ec2fac661)
            mstore(mload(add(vk, 0x1e0)), 0x2dda69ba6459cc3ac9a3e5317f49fcc4f3440cfd52988c26291dfd1e87b04e6f)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x2dc6684d2d5bdd38a9a7b0cd423b0d0eb09fd69d5c8b57742c825aa9e7265027)
            mstore(mload(add(vk, 0x200)), 0x0f73cf0c49fa7e74631c52c892e28ff074bacfdeed781f0e3de831584b4b3bf6)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0daa75291f1b7647429d7803bac10bad2c33d326485f35d6e3acc76cae29425e)
            mstore(mload(add(vk, 0x220)), 0x1a8d77e5a67208dc5b890536bf76810812c248117924266a50af4a6e61c5c398)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x19dc6aeab19a8e667bd6e03193da7d4382b4a0e4d90644ae606cb79136609957)
            mstore(mload(add(vk, 0x240)), 0x1b3438ab6f43a3078f700911143dee025340792709bfa8721fafd4c8c4690549)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0b0372e6b09b23afb4116d4919aa019114a61a77411eefc21fd3b835a422e8d4)
            mstore(mload(add(vk, 0x260)), 0x300b6b64830bc9b83b2ddc456d4e84fbf0a7900b41cb81da4dd957c02a4eee31)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1aaff77aed8b61aee4ed0f6526653ae14943223c57ae12b3d98a5e5ab4d76341)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 691) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

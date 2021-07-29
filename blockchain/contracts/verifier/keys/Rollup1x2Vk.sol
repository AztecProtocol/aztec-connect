// Verification Key Hash: c51d99f8026c1fef32daf17f82f3a26e292297ae8b47bcc1c7f897375e8bc1c2
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x2Vk {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 2097152) // vk.circuit_size
            mstore(add(vk, 0x20), 68) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1e841f3c6a621c66e54b2cad8a2fb459caeca9c7ca4db7de5987d4e11fd1a04b)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x30529cd4ae6996cc8de32eba6537ab3ec09edadc868981e463edcfede24249d4)
            mstore(mload(add(vk, 0xc0)), 0x0d2959695153c31b12038370daf2e3728bf9bf2bcf80ac944866e366ef3f2be9)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x2949a00901fa12b938be3562e9a39eb4cc6b03ba91be4e3aca88b39bb3b54359)
            mstore(mload(add(vk, 0xe0)), 0x2c4f4ff30c8afd22168294b3783e37526ebcd0082c671becc05e225c48642b7a)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x2c93c8b4e61e44d3c605875c186d7d71bb3f2a3c7f1eb8c20c2242c2dd60285c)
            mstore(mload(add(vk, 0x100)), 0x2a7c48c31e8a1c5f00d69699838e518fcde015eaf1042dcd822e1b477a743bcb)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0a6daf636a005bdda0ac6412caa3fb0653cc533397c39e7b0eedc6b84193be05)
            mstore(mload(add(vk, 0x120)), 0x2b119b83d1c161c499cd74f35adce0068eba65a39380d88498aeb576236f35be)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x00e31ce835de74c42945e202c69c81707dcf065748af351b55bbb1814145f597)
            mstore(mload(add(vk, 0x140)), 0x28197ca43e513efca54dd97c4bb68ec5b33f69dfeaf552f87356fed173f1cc0a)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x1ca61a470c727a974971ef24a1036632c75d0f29fafc86b4e8af1bc91b02f08b)
            mstore(mload(add(vk, 0x160)), 0x2945dffd33abcf5984703c3d53aba58ebd70ba1cf169f63fa4d2469e3bb1bbe1)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0bee06becf0fa11710470d6efe4bee98195a4f19bd729bc6408f596c9fe22a8f)
            mstore(mload(add(vk, 0x180)), 0x0b0313dec99ade80f59a79a871519b807280faeafdb229a8023a716bc28fcd90)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x2ea39c50e80e4477576bb4e503292160abd46e5ae3fd2035de3d35df48f4e2d3)
            mstore(mload(add(vk, 0x1a0)), 0x06fb7cf48cd490121706a1f327e14a4e052620665d3d613b3447324eb1c745a7)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0d8a902b069f2c19ea1471b7d7e43723b9519e299fd6ed6bc9541a98e40bf884)
            mstore(mload(add(vk, 0x1c0)), 0x016767e876e3749c97cacedea2a30d45a5c8232033b543ae3108a661c6a52663)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x0c9a041722c3e9dd0042a7c3c3ea9225723d6a9a3e81192f2aba75dfe4e74486)
            mstore(mload(add(vk, 0x1e0)), 0x06e82cfdadb264da3aebd1606b4f656a0341d8eba069b158bbe19f11a6ed82f3)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x18909554d3e36bff6a3186686ace0224bd820c1af8d7b2261783d44e5033d245)
            mstore(mload(add(vk, 0x200)), 0x15ebbd215df71b9c05929369f352181c0099772ae054bff81c5284d67a44005a)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x10d96154fc05f08295893c27e1b342c8c46cb78743adf2a0695c75ee1fe34c9d)
            mstore(mload(add(vk, 0x220)), 0x0cf9a36997077a09b7b4a6d2b18aad4e2d0bc1927b73147760d4224489e5313c)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x26c587fbaf9860dddade3e698cf1fbd63a7c6bd43302a563ef0549f9030830a6)
            mstore(mload(add(vk, 0x240)), 0x092d71f86d00072d44ad87f365d630f86339ac46a4bb6dcac30ffe29e35c7d9e)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1dc145b0896a6d50b33b2f55918be29d1f0f2003ebf6c019345852c2e4375213)
            mstore(mload(add(vk, 0x260)), 0x1455cba78620182f9a3ced5a731e8064897271b42609528e1dff560cd33bb249)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x09766abe42de09fa0b260c3dc18462998258dc62c86a26199e6f1fd477311ec4)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 47) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

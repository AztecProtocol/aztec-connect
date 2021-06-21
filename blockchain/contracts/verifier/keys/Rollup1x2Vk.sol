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
            mstore(add(vk, 0x20), 72) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x0378eac6430c3f32cc5c9ba3f9d01279ae0efbb1a2e6be418bbb47719a5a7ac3)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x2850087ec519b677d70d5c6e1177d1b1656bc5cb7808cce5fa27b19ed7459eb4)
            mstore(mload(add(vk, 0xc0)), 0x11a456015dcdc564b32ab718577fe975a51d49fbb86006783f85cfc2ca29f111)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x011f2145331e66172ece79f31061e73b7568af7b4b80c1642dc3e27528417f27)
            mstore(mload(add(vk, 0xe0)), 0x20a12c9ba4e3a312e1426f32422a9596631c7fb17805867bbd698172233eb3c1)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x287f2021ace729600317a886b411548aee61913d1d1943085947cdbb2bf45ce8)
            mstore(mload(add(vk, 0x100)), 0x082daf96cd9fc2ffe293abb1b26d5eef0a49ad67a9f84f194d138955374fb397)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x1df1346e029a8d4995e0a9a62e5eca43b5cfc74fdc1661e752caaae0b0a3bdfa)
            mstore(mload(add(vk, 0x120)), 0x0f03cb5a62de662cb9f1130018e5311aad163f9b80dd118fab8d9a6439108df0)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x015744b4859f0d99f90fd610a2710b505c84d1b2ea3caf897792c67f6d2561c0)
            mstore(mload(add(vk, 0x140)), 0x283de9b66f188a131a028210e7312aa1db9b88ddfe3b0281f5c25ba421dc38b0)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x271e7761bcc118c600d3e8a471da32ae41a22f3dbd4d19e6383c9f78b1314b79)
            mstore(mload(add(vk, 0x160)), 0x263cc455282ddc75076b9b595b3a5023e18131b2f54e75ff088adc9fa06492b6)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0155f27c5e75706696451a2f4d94dc5e500e246d6943e90a7d6a6a92fc46e368)
            mstore(mload(add(vk, 0x180)), 0x040b845b2b57b9d86134d28d88682a3e27662c61e5bc7b3e3192c9adf4b86893)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x1786c106b9edf491b1b47ac44cff8a62362d9e8417ed92b63e4d9006aa598530)
            mstore(mload(add(vk, 0x1a0)), 0x14f2d2e19b026c6ebe5d3548373e9e280e4e4152a087b09ae9fef1fde2fb5046)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x082a8de218c354d6088c6c613123464e4228a35335e233a6edc237e012411870)
            mstore(mload(add(vk, 0x1c0)), 0x1a252a9d8b758bae13b9fe6b6928e1437117d6bab7bf2a89102b63af35569cbb)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x2ec1f19fc860917a526223ba956547f5147ffa4dc2699af78b0b5b51d568dc59)
            mstore(mload(add(vk, 0x1e0)), 0x16f3456cd22aa34f1dc3d18879bf633e11e8c468a8213f8445dc852d1919a474)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1934fbdb0d8cb6a15af9a3a5a8b74c4fd0f5666174b3598fa3505250066ec0b7)
            mstore(mload(add(vk, 0x200)), 0x2ca9e1096fac3a2762ae08ed72241a4057a99fc78c22bae249ab289e187197af)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x2d38356513d55c3360b7dd5a630b9878548d61658973971af409b3d8dceec0c7)
            mstore(mload(add(vk, 0x220)), 0x035289c28404f2d57fdac4743d7dec825b987704ad66b36140d6355a1c86f661)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x089622c3a22d9902a07282fdf8a451f8f5d3f13b609825c0b9a4bd1c388faf5f)
            mstore(mload(add(vk, 0x240)), 0x05467053e4bfdbdc771a4334df8806c3b8e8ac4ad009ef930967f0ed419a108c)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x25b95817f7587ab3afc54517e149c900b8d575951225fa6008c6f53c16df7fcd)
            mstore(mload(add(vk, 0x260)), 0x020a8687b4450c0aeb284d0410f70641280313bac2c5b77afa1a88d659936ef6)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1130597c45d70ddcfd562d3b904b1b1417de572e74582fb3e6aa2aeef9e0046c)
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

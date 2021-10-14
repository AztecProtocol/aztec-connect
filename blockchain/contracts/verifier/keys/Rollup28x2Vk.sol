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
            mstore(add(vk, 0x20), 798) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x083eec82f54876c5f79fe64d804d9b939a4151dcac6d8617b3d6099866a0f77e)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1d88766a559cbf8dbb94eab290f1b709b8c4c1950fde35d10256879d594f4fb0)
            mstore(mload(add(vk, 0xc0)), 0x1735a313d5f63d25ad1ceab7c79fd02e8c399fca8ef16ea2c783c5cd6a065925)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x267d598d81622c1cc210990690b4d9dad3824339b6de77e6281e0b3a1ef12ff7)
            mstore(mload(add(vk, 0xe0)), 0x149881c31dbf92050731c54853e1dbffce5e432bbedbd6701d7f6ebcc9e86661)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x01b4cc111e156304b4af0da5d44df4da0a14f50810ec390cec47639809adb97f)
            mstore(mload(add(vk, 0x100)), 0x200e37ec9a0ffaa0e25ae88f7891ba70c6eebd088ae5e7a58b1bd758e0839067)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x06928009896114dc84ac0de71d224afdfb4267dee32a66dd95be05a33ebac2f2)
            mstore(mload(add(vk, 0x120)), 0x171bd670606e79bfd4bee7a904535a6c687c08e32b110942bcb8cd1bd082240e)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x02bd31be051b434e285d81c6d956b5a72140916427c8879357d75252c5001813)
            mstore(mload(add(vk, 0x140)), 0x080637fa943079b3905b2171d3d03e57a34af325c36d6832563a8c05f102d809)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x22288d0eeb954a0dd52f1ac95901d35de729c89f7f6defcbfbd8762ee56d5726)
            mstore(mload(add(vk, 0x160)), 0x242c1cb27ab6c727f4f543e6c12e1a03dabcab2201fea3a054da1b8fa8886815)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x2e852fe5eced4ff84316eb02647b450d7b1f0cd6b7789581858f9f53b2ee5b97)
            mstore(mload(add(vk, 0x180)), 0x133ec8621fbd6894063a5c4a636a87758694e374344c9ca10c259a44ee1c594a)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x18879c87e928f11b93a567935298d09e734ccf5cea51c755d6aa0bc23dd840a6)
            mstore(mload(add(vk, 0x1a0)), 0x214f7db081debb408f865a226cf017346cc2b06f3f6ff7ac7fbfb35877a87a36)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1fd8ca5d3daee196ea279e97c1d6d8048b4c90185a49b1f3a1063c6a4e09044e)
            mstore(mload(add(vk, 0x1c0)), 0x015968f39bf53733220cf5277c47c7b6bd5dc05ef53cafb6547b3a2343d43d54)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x05f18632da7092477f0ddeb08174ca6aa81104d37d98fe3838831612b375fd02)
            mstore(mload(add(vk, 0x1e0)), 0x27257a08dffe29b8e4bf78a9844d01fd808ee8f6e7d419b4e348cdf7d4ab686e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x11ee0a08f3d883b9eecc693f4c03f1b15356393c5b617da28b96dc5bf9236a91)
            mstore(mload(add(vk, 0x200)), 0x080083de43db5d2797be31d60b174cfeb2bc473b4e6acc3a0d2c54e853faff79)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x022b3876a88df3c53766c6a8caf399e9b4de3c2d64b6cc080aac85be97dad8fe)
            mstore(mload(add(vk, 0x220)), 0x073fdc8c514c0819d3f8247a228bdfb702dc42c315f092a3d4a68ec8c4258bb0)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x22d229466abdf8460d69afc325fc9337fe5153c7e35f3a6727d70491d512afc4)
            mstore(mload(add(vk, 0x240)), 0x09cc150da825c5e6828a07fd571bbaa40daa350d9cdb93d5422637dbede4832a)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x20a923804888ce991a0dcfc252eeb4969ffc2615aab03fa3189e8e090c8cb6fe)
            mstore(mload(add(vk, 0x260)), 0x15075967867a50974b5ff84e2dfa0ca762898a302b9163f45be68fe653b8fee1)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1c314b0f1d0722f5e32dfdc007f584aab7513a08a61eb53d850f1453f97de23a)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 782) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

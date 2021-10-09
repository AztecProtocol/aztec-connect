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
            mstore(mload(add(vk, 0xa0)), 0x1340b5e121ced615f56db9f918274fb7d288a3ab61dff5a19594c2b96cbe23a5)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x0a0853386dcfbf113a2f980b6251caf5a68f018937f854d4910d99fc01b8bebe)
            mstore(mload(add(vk, 0xc0)), 0x2b74a88d2c617027d2a63bbf900ba06ae721d19c7d061ed9eca3437a85bd293d)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x258952e1a7066e37408f8dae0b7c8a04af9dc500ffbaafb10e5837171d749e23)
            mstore(mload(add(vk, 0xe0)), 0x149881c31dbf92050731c54853e1dbffce5e432bbedbd6701d7f6ebcc9e86661)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x01b4cc111e156304b4af0da5d44df4da0a14f50810ec390cec47639809adb97f)
            mstore(mload(add(vk, 0x100)), 0x200e37ec9a0ffaa0e25ae88f7891ba70c6eebd088ae5e7a58b1bd758e0839067)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x06928009896114dc84ac0de71d224afdfb4267dee32a66dd95be05a33ebac2f2)
            mstore(mload(add(vk, 0x120)), 0x171bd670606e79bfd4bee7a904535a6c687c08e32b110942bcb8cd1bd082240e)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x02bd31be051b434e285d81c6d956b5a72140916427c8879357d75252c5001813)
            mstore(mload(add(vk, 0x140)), 0x080637fa943079b3905b2171d3d03e57a34af325c36d6832563a8c05f102d809)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x22288d0eeb954a0dd52f1ac95901d35de729c89f7f6defcbfbd8762ee56d5726)
            mstore(mload(add(vk, 0x160)), 0x1e3bad59a87695df69e74936b84df8586cda08879a092aff8cd0e7b5d3b823f1)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x0c098d054018de2525453077f7b9040c8559c629ea1ab21965cc167d02349e19)
            mstore(mload(add(vk, 0x180)), 0x133ec8621fbd6894063a5c4a636a87758694e374344c9ca10c259a44ee1c594a)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x18879c87e928f11b93a567935298d09e734ccf5cea51c755d6aa0bc23dd840a6)
            mstore(mload(add(vk, 0x1a0)), 0x214f7db081debb408f865a226cf017346cc2b06f3f6ff7ac7fbfb35877a87a36)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x1fd8ca5d3daee196ea279e97c1d6d8048b4c90185a49b1f3a1063c6a4e09044e)
            mstore(mload(add(vk, 0x1c0)), 0x015968f39bf53733220cf5277c47c7b6bd5dc05ef53cafb6547b3a2343d43d54)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x05f18632da7092477f0ddeb08174ca6aa81104d37d98fe3838831612b375fd02)
            mstore(mload(add(vk, 0x1e0)), 0x27257a08dffe29b8e4bf78a9844d01fd808ee8f6e7d419b4e348cdf7d4ab686e)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x11ee0a08f3d883b9eecc693f4c03f1b15356393c5b617da28b96dc5bf9236a91)
            mstore(mload(add(vk, 0x200)), 0x253616b4483515298e05aeb332801d60778df77cb9785d8bbee348f20df24c4d)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1d344a80672c2ce73da5ab7fcb939aea3162ebeb3d636ddf4d34d0a2edad8950)
            mstore(mload(add(vk, 0x220)), 0x05db52d0db9140fdddb8e18abaa9c3c5595ef6140da4104a23066c821d8dc252)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x048ace3297ef43c7ab5fdf26709c0b3020cbcd0965583d1f56d1b78d9e92f695)
            mstore(mload(add(vk, 0x240)), 0x1c5a8cc38ee5b3bf9d6924dff25213c04be2debe4cda2fd69ac1c572958090b4)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x0d0b8b61d8ac52932f1e660152577611067eb8edeccc313504cc922ad64f8b06)
            mstore(mload(add(vk, 0x260)), 0x2df68d8c85114395f291d939ba368f5e3c37e7ff0989016b6eddf25bd792d883)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x063dc89d12713d19f93c6ffe414a57da4e7628816809e8f9f38709a7b46f659f)
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

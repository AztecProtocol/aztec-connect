// Verification Key Hash: 0463f44ebd789da034e604226af7ededb7ebecae04daf8e599a011edaec0a36d
// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {Bn254Crypto} from '../cryptography/Bn254Crypto.sol';

library Rollup1x2VkTurbo {
    using Bn254Crypto for Types.G1Point;
    using Bn254Crypto for Types.G2Point;

    function get_verification_key() internal pure returns (Types.VerificationKey memory) {
        Types.VerificationKey memory vk;

        assembly {
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x1b3f1e22f229309c78b18773ae56e59c62bc832d63549c8684373bc7ea45561d)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x27c273ac73a5bf1f579578ea8f1e47ab5a167fdfa4754d487f7a2ab10040c6e6)
            mstore(mload(add(vk, 0xc0)), 0x1d3893dab7efff1b6e37bc77356402496517389f6c6f2cfc6f62ecdb0a3826c3)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x21f25ba6d821fbcf55caddd37d49fc0f8e4e921197ead296565f50f0542c6983)
            mstore(mload(add(vk, 0xe0)), 0x250911bd2b96219c2df1c80d615012e39f8672bfcd17afabe9fc441e31f41000)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1d40c1bde44eefb4b0a4093554b592dd67a80f7825f2c95dcf402ddb9098cc8e)
            mstore(mload(add(vk, 0x100)), 0x01d00e8eb3a0c4817b9f3eae57afb665a4b33c0c5d4577c8027e0537aa6846f8)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0eda434f684d3071442305025121a0d0f9a443e908c05fef676fd7dfba86d073)
            mstore(mload(add(vk, 0x120)), 0x1f9756008522e73511bd1617a34e0997af1a9fbd886533148a95a60e10a45a30)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x273dd7a238876df90507e85e880e6782b765baccef38953f2ebc05f34b335655)
            mstore(mload(add(vk, 0x140)), 0x189a1732e5abf2b704b19bab5b301fdf4d1565716a734184164e4d7d7478b3f1)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x3034aa80bf40c87f9d99cbda6466a4c0db73f812ebdd063d47ec4e817c09c6ef)
            mstore(mload(add(vk, 0x160)), 0x292c25225d8980e26d5a167cd985a4487002626b8d99dadf3cf158f78e52f1e9)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x1ebe92e30740264c34cb628df70bde18311be79b09e49c78b37a152e0d32b478)
            mstore(mload(add(vk, 0x180)), 0x2a9d55201fc174db726fb18530f87d0bbcf9bfbdf1bd4f90c5869472fc1c77da)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0381a31a4886bfdaf4c5fb70c2bbed8b9aa0188184823d78515ce7b1524f28e8)
            mstore(mload(add(vk, 0x1a0)), 0x2165183110a085953bdae880c3dcef22f5a330073004a1e8e802c34f3c355ea3)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0fe1d5af807beea3cb5de2a8681b594a789091b7157cf29cb334844eee04a4bf)
            mstore(mload(add(vk, 0x1c0)), 0x289cd33491bccf369df35296b5f4e476515d3199ba414969db10c41b48679991)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x044471185071fb652907bbea02581052fdc5f15e39d23094d7617995d7e80ee5)
            mstore(mload(add(vk, 0x1e0)), 0x2e761762b697eb1d339b76ee081ab368906fd8b78b58128bfc7a0298b1ea3574)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1f325fbe94b5693395c2a9dcc204c258cf4e4a7599c01fcdd5b0a0bafd443091)
            mstore(mload(add(vk, 0x200)), 0x20ef99c1d15f81653f592ec15fe22c31814b683e28ab99d08b5fa311d92e690f)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x153fd371867c26c8a43fbed5474b0a749cf5b5f15ff15971ad2e0950fe39c1de)
            mstore(mload(add(vk, 0x220)), 0x06bf66f0ba5d24fdba9c82de5def4a64fb7ee8f7b343027b4482b1a6c21d614d)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x01f295cd6afba58b093564046580b4557c0736545e642a1438bc59dcc1a7fec5)
            mstore(mload(add(vk, 0x240)), 0x2e12cf8c46b74b070f66de3e49fd36458d6e54ff585b5c5744db64d2229d4cfe)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1b48f6cddfd9fb2b1276456d9b5fcfb5a2aa4675a61e7047e5110573b802219c)
            mstore(mload(add(vk, 0x260)), 0x2f1747e6cc5b1659e60a692ca567eff8dbc1dc21e57cd377c29625508498b93e)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x075f229e9f8c0fefde60ce90d4051d624b67ce2d042777c33f3f85e8d1f00a88)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 1) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

// Verification Key Hash: 890a21de729113d42e31647d5162a037f3e52785b09725c8305a7cd51022ceff
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
            mstore(add(vk, 0x00), 4194304) // vk.circuit_size
            mstore(add(vk, 0x20), 17) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e) // vk.work_root
            mstore(add(vk, 0x60),0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041) // vk.domain_inverse
            mstore(add(vk, 0x80),0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2670b0caa31978b4ef5427314c89906857e68a43ca40fbe6a75eff6f58fcb340)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x14851394ed7a094ad68ea846885a948c539577dac44862d327fcbedadb8280fb)
            mstore(mload(add(vk, 0xc0)), 0x035acbbc95e15530166b97642f0270626222ca46d17b0f8b023c309121c48930)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x07354e9e6797b79b67876a3209e65ba58e73bd1355667eddc86f03402fb96cc8)
            mstore(mload(add(vk, 0xe0)), 0x250911bd2b96219c2df1c80d615012e39f8672bfcd17afabe9fc441e31f41000)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x1d40c1bde44eefb4b0a4093554b592dd67a80f7825f2c95dcf402ddb9098cc8e)
            mstore(mload(add(vk, 0x100)), 0x01d00e8eb3a0c4817b9f3eae57afb665a4b33c0c5d4577c8027e0537aa6846f8)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x0eda434f684d3071442305025121a0d0f9a443e908c05fef676fd7dfba86d073)
            mstore(mload(add(vk, 0x120)), 0x1f9756008522e73511bd1617a34e0997af1a9fbd886533148a95a60e10a45a30)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x273dd7a238876df90507e85e880e6782b765baccef38953f2ebc05f34b335655)
            mstore(mload(add(vk, 0x140)), 0x17d7affa04bd4a8bcf0643f3f3db8e946b0d5e46b9f85ee4b7bf372a5e1e6657)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x195044dac72564ab0cf56258b9b7d36e2c52178b085aee5e4d34f54455190c07)
            mstore(mload(add(vk, 0x160)), 0x0a85d7ba185d9abf49ea9c9a95fc3be670212b8f1a7b990f6f28973d4a18adce)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x250d75bfa923a02ea23bcccb6fe167fa52543ecc2a4e3e2dd858ed0593ee2d73)
            mstore(mload(add(vk, 0x180)), 0x2a9d55201fc174db726fb18530f87d0bbcf9bfbdf1bd4f90c5869472fc1c77da)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0381a31a4886bfdaf4c5fb70c2bbed8b9aa0188184823d78515ce7b1524f28e8)
            mstore(mload(add(vk, 0x1a0)), 0x2165183110a085953bdae880c3dcef22f5a330073004a1e8e802c34f3c355ea3)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x0fe1d5af807beea3cb5de2a8681b594a789091b7157cf29cb334844eee04a4bf)
            mstore(mload(add(vk, 0x1c0)), 0x289cd33491bccf369df35296b5f4e476515d3199ba414969db10c41b48679991)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x044471185071fb652907bbea02581052fdc5f15e39d23094d7617995d7e80ee5)
            mstore(mload(add(vk, 0x1e0)), 0x2e761762b697eb1d339b76ee081ab368906fd8b78b58128bfc7a0298b1ea3574)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x1f325fbe94b5693395c2a9dcc204c258cf4e4a7599c01fcdd5b0a0bafd443091)
            mstore(mload(add(vk, 0x200)), 0x2c0278fd62e4ace600c57a5b2f47f00955858c0d015bcf537ed452f29824de5e)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x1a24c6adb8a129d1d92fe0ec8bf26bc169f2e8831e6d232584ee010183c204f4)
            mstore(mload(add(vk, 0x220)), 0x29c9a99d7c234fe610497ff0b6ac842f65a5c737349cf87ee855f062d6d4f8a7)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x225d57d2d51fba2b732e2e9252a031111491016c48898d1010e9b6b392a4dadc)
            mstore(mload(add(vk, 0x240)), 0x03a8ba0df1d399bb316de775b8b1f9bc8b763e31ece2ec9e3c5c4e283d337461)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x05ad04fdf2e787e7413cd57ced5b205835681b6f9dc204d382b7a7b23be04d13)
            mstore(mload(add(vk, 0x260)), 0x29ec3fd854c2e04bd6ee0f0dea7eb1026162475be6429a3eea4b86b649f2f9c6)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1a1a17737b43614715c17a68219dab73f5d8a12f09df932d42aded5b9b0a82b5)
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

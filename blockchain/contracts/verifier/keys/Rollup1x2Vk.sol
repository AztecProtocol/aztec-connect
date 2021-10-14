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
            mstore(add(vk, 0x20), 54) // vk.num_inputs
            mstore(add(vk, 0x40),0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523) // vk.work_root
            mstore(add(vk, 0x60),0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081) // vk.domain_inverse
            mstore(add(vk, 0x80),0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0) // vk.work_root_inverse
            mstore(mload(add(vk, 0xa0)), 0x2687ed9b44aec736bc99172ed962a6183cc72976ea02c71335d829d3ad64b084)//vk.Q1
            mstore(add(mload(add(vk, 0xa0)), 0x20), 0x1f4ec5c8450f7734d16efdf432cda63197e8f2f2b298f93023ba3ae4e1363f0d)
            mstore(mload(add(vk, 0xc0)), 0x1b752efd914bbceb7b25c5117478db6d4390f3b47612f83c8a96f4780926b06f)//vk.Q2
            mstore(add(mload(add(vk, 0xc0)), 0x20), 0x1974a9d6db2c8da463af3c6eba886c6e6e1e27d6b199ac80a783d790f29d38ff)
            mstore(mload(add(vk, 0xe0)), 0x1ef5a0a59b3b6bafee6555671817a74b831e56ab6fe10affd486ce8b17d41585)//vk.Q3
            mstore(add(mload(add(vk, 0xe0)), 0x20), 0x0c56d219136bb97fc64ac4d21a81f3375e68c30bc19100b6e91bbcbcb5a1c81a)
            mstore(mload(add(vk, 0x100)), 0x1f27d0f27790b9b54089b6d4cf6753665c8e4fcd7d5332ed68a11c24297aa8a5)//vk.Q4
            mstore(add(mload(add(vk, 0x100)), 0x20), 0x012543acb47293aa56293e9795aad4f0723217954f05ec91b3024de0bc630351)
            mstore(mload(add(vk, 0x120)), 0x04072b0a6b300b05d31e16ecc4c4c5d24cc325d90728ed15305d1a804233f94f)//vk.Q5
            mstore(add(mload(add(vk, 0x120)), 0x20), 0x1b286071b0a083bdb26af1584fdf83c465745404ce1cf2b8b349154cc2e0580a)
            mstore(mload(add(vk, 0x140)), 0x24e87dc9bd6343226fe885af9f30da07c22d23c35a93dcd6cf3258e08c3fb435)//vk.QM
            mstore(add(mload(add(vk, 0x140)), 0x20), 0x0ceed4102b3a4e272c30c9098ba676518ea4cef6c469a8c3dbaec2e0df17339b)
            mstore(mload(add(vk, 0x160)), 0x24367bab720c963fd48c02b9284db8f8c7171514c143c8c7282557ab94091c91)//vk.QC
            mstore(add(mload(add(vk, 0x160)), 0x20), 0x181d6c7211dec885d0ee3e81de3e6c43a77dbcb0cad88a3c3988572f621120f3)
            mstore(mload(add(vk, 0x180)), 0x2f50fd42e3b7d84db82e7252791073d4622cd1d3993d657deacf0879edf7e8ab)//vk.QARITH
            mstore(add(mload(add(vk, 0x180)), 0x20), 0x0d891e8d949a242b3430e33247bb95636bde08c062150f61408685e17ec61838)
            mstore(mload(add(vk, 0x1a0)), 0x0aad547972b3b99db5233ada23dfa01701d0d50bb2cd2d8919174e6e3551d5c3)//vk.QECC
            mstore(add(mload(add(vk, 0x1a0)), 0x20), 0x2fa67d69cb906af7ef46bafcde68f97a80f002bb52bf573341e577c55a428a36)
            mstore(mload(add(vk, 0x1c0)), 0x035bb3d3ea11cee216b5fbcb0654c7abdf976d53196bb24f6414b9ccce34b857)//vk.QRANGE
            mstore(add(mload(add(vk, 0x1c0)), 0x20), 0x1cd877aed87b33e713def94b9e913a7f60a07109d32c3aef18097bb802e6a6b7)
            mstore(mload(add(vk, 0x1e0)), 0x2956cd5126b44362be7d9d9bc63ac056d6da0f952aa17cfcf9c79929b95477a1)//vk.QLOGIC
            mstore(add(mload(add(vk, 0x1e0)), 0x20), 0x19fe15891be1421df2599a8b0bd3f0e0b852abc71fdc7b0ccecfe42a5b7f7198)
            mstore(mload(add(vk, 0x200)), 0x0d2920f8b4371da02f7bdd75b02d8d228c93b3c2f625d2471aab68b20d05f505)//vk.SIGMA1
            mstore(add(mload(add(vk, 0x200)), 0x20), 0x0a01f6841b6a7eff29a6bf75ea4678730aa46ea3d5022848592e646bb7519fb5)
            mstore(mload(add(vk, 0x220)), 0x156e51d3f6a9da2cc16546dd19885209c4bfa877c31740f20a8fadb18cc10de4)//vk.SIGMA2
            mstore(add(mload(add(vk, 0x220)), 0x20), 0x27ad9a3d5128ddac2f0a622b79b0a794e57467bc58915f7b6fc1079cb903bea2)
            mstore(mload(add(vk, 0x240)), 0x0644e778608ead638cfa9f80121db8625f32bdde00b3c8b69fe8b47eb835cf8b)//vk.SIGMA3
            mstore(add(mload(add(vk, 0x240)), 0x20), 0x1a01d5e3ea31cfb33a101a23d5334b60ab133a971ec915a2324ec36326a80d4c)
            mstore(mload(add(vk, 0x260)), 0x02f9fa9352324ead3f37993f25eb36adbe46ed924969de68ae29bd1d20bb2e8a)//vk.SIGMA4
            mstore(add(mload(add(vk, 0x260)), 0x20), 0x1291ebfd5412132209c8da19817f4663de67cace2a5cd49aeac51f4c53be946f)
            mstore(add(vk, 0x280), 0x01) // vk.contains_recursive_proof
            mstore(add(vk, 0x2a0), 38) // vk.recursive_proof_public_input_indices
            mstore(mload(add(vk, 0x2c0)), 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1) // vk.g2_x.X.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x20), 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0) // vk.g2_x.X.c0
            mstore(add(mload(add(vk, 0x2c0)), 0x40), 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4) // vk.g2_x.Y.c1
            mstore(add(mload(add(vk, 0x2c0)), 0x60), 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55) // vk.g2_x.Y.c0
        }
        return vk;
    }
}

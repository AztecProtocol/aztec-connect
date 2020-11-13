// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup1Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 38;
    vk.work_root = PairingsBn254.new_fr(
      0x1ded8980ae2bdd1a4222150e8598fc8c58f50577ca5a5ce3b2c87885fcd0b523
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644cefbebe09202b4ef7f3ff53a4511d70ff06da772cc3785d6b74e0536081
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x19c6dfb841091b14ab14ecc1145f527850fd246e940797d3f5fac783a376d0f0
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x0c0f277023776c760bf03e43bf6e19908996fc64e75f5752300b0260f002971d,
      0x301fcef8afd0e256f1dba205e9e59b29f937ddfba018f23766cef31d2591a771
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0128be7cc8453103c846dbc874d9c212bd5f6856e6a9955cbbae1ce6e290497f,
      0x13912c60a8b9b1c562663daeda3ae482cd5c225d333876ae89d1a12d5f05ffdd
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x0b461720526a6aee6defebbe99e28d6b0d1a9c555ddb659ba2f89004db49e41d,
      0x1c0bc250db1c6bb65e915c9d1da9475bb8f210d681e1ebc4776131a9d41394d9
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x06dc9d3f0eaf586ad33c7c99a7ad017e62c23a425bca3b1321f88c0a982706ac,
      0x044b0724dac7943daa8a83be9851ca508146175b765a2923f171e68dabc2fe76
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x124970c5902365cd71d6578c07e0594eb9b08ddd93c55aad3d587b5368b492dc,
      0x2ea796517156ad3e72d5f9c46b8b4ce712057981d889c110e075cba47f9adbc8
    );
    vk.QM = PairingsBn254.new_g1(
      0x2ba5bc8ef2e02f378c2ca039830c454b1031ac91dd0841540f01f6c3a09007d0,
      0x059035858db28ed6476e0f27dbc6e5fca9e02104f60ad210a6233990b595c389
    );
    vk.QC = PairingsBn254.new_g1(
      0x2dc68e8cb3f645b7017419dfb291aeb2f40dd86de1ee9b35cf3423e0a920322c,
      0x2bdfe1341ca16048489478702edc37b7ff90f895fa670275332a3525e3deb7dd
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x071acb6ae352a056cc5509e053df2e3936795b302e5ec88f9a7eabe53a0820e8,
      0x2008813a38b46c4472d5d1e470729a9857d2cba907fa3b4f1f6750572833cb24
    );
    vk.QECC = PairingsBn254.new_g1(
      0x07db3614db5b86994514c2983d50dbf0b601b49382f7f98c7cee34d46a69e336,
      0x119378e87875acafe258f7dc29c6e3efb48264a77691bd482912e32273f37109
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x01cc59633d7229b4d8ceb84c940392859a8833e4dce6d5c4e77849fdb208d830,
      0x2074e5f86070913d15239a4c4f1477508ed28d924c6bda1ae4efef1bf07f29f0
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x222546dbb984205229305de1be1d1336ac0a4b344c6571be8b0288c2eaacb0ea,
      0x0b3a2edfced86bb74c3ebd62807d9510a950da435ba07f28b043cb4882357417
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1c983c76c3b165fd96c0bd61ea487913dd50602f7131d643bce1281f87a09fbd,
      0x1a211a28c412cd9272343e43bb345206d0637b8981c38cdf0ecb8e4415b2f2ae
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x2d13b5d603a28cd2f421283d2f1097a8e2df6ef552ee37851aa78e0c58bcf43d,
      0x0a336f2927598cf3e8d41719a2657f4fae2267c873a772703db15c9866412f50
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2be70e0790f0e44fcbecabda211363d8052bd474adcafd9e08457e794bb4c14f,
      0x2618ae0dd0d78a49e40293ad1b46600ea68634af5263f62ccbe0cb4cc05a985a
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x07e7d271b51cd82621ffd79ba21ace05178a892365a8ee2b7332558d6f16d365,
      0x141fa048ea0f2e8ff7685d08b8ad3519fa69efeba752a20f48f2964918e72f29
    );
    vk.permutation_non_residues[0] = PairingsBn254.new_fr(
      0x0000000000000000000000000000000000000000000000000000000000000005
    );
    vk.permutation_non_residues[1] = PairingsBn254.new_fr(
      0x0000000000000000000000000000000000000000000000000000000000000006
    );
    vk.permutation_non_residues[2] = PairingsBn254.new_fr(
      0x0000000000000000000000000000000000000000000000000000000000000007
    );
    vk.contains_recursive_proof = true;
    vk.recursive_proof_indices[0] = 22;
    vk.recursive_proof_indices[1] = 23;
    vk.recursive_proof_indices[2] = 24;
    vk.recursive_proof_indices[3] = 25;
    vk.recursive_proof_indices[4] = 26;
    vk.recursive_proof_indices[5] = 27;
    vk.recursive_proof_indices[6] = 28;
    vk.recursive_proof_indices[7] = 29;
    vk.recursive_proof_indices[8] = 30;
    vk.recursive_proof_indices[9] = 31;
    vk.recursive_proof_indices[10] = 32;
    vk.recursive_proof_indices[11] = 33;
    vk.recursive_proof_indices[12] = 34;
    vk.recursive_proof_indices[13] = 35;
    vk.recursive_proof_indices[14] = 36;
    vk.recursive_proof_indices[15] = 37;
    vk.g2_x = PairingsBn254.new_g2([
      0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1,
      0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0
    ],[
      0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4,
      0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55
    ]);
    return vk;
  }
}

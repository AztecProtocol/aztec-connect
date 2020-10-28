// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup2Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 2097152;
    vk.num_inputs = 50;
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
      0x2503c4685d484f7ac329e8354ad5d3ccfd836e1849ee4dae1448c7b68b54bb4a,
      0x0d71401255a070337967758ba4f78a441b28b42ca3ae770e1ddb36abfc530680
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x04f2da204c4bd309f5d48b0ed43841921e4e7a31bb34457f5103061f6cb495a8,
      0x0c6c5b0a9c043358330ab40173b702447d97a8c28941d476cbaf1c3668dfcce3
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x1920630fd8e3eb1de164e4c5b07e4157f784a78d4ca56b690bc5e0c423140826,
      0x06a8f80979924a49082c8e50d13710d9d776304afb24d310b31c0811e9030cf2
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x2ef602608b70abc520d4b933bd0e91785812eab657ba2932fa8b36c8b624f76c,
      0x14aba3254746f2c2d394d23aea5a102562698ceb81343df7c4b9121fce88b0d1
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x054ca6e83736a08126cd708a2d12d9600d8e7b552481dd088da252f20b0ac2c3,
      0x2eebea940bb6b0bd82ca2f6166c58a19cb690760dbdd5aabb4ffd16f4224d5a6
    );
    vk.QM = PairingsBn254.new_g1(
      0x008113ccbb90c5b59a831bbf907b7ad7e6930de9d4fe42b384ca136dd23ba73c,
      0x1fdf97d7e1f50141021b180c63fb43a1d174ef9082906bf0c2c85c5755e0a468
    );
    vk.QC = PairingsBn254.new_g1(
      0x01bb4029c933d9a403ddb525ef192da085cf6602781487320481e69e77b0d409,
      0x0ceda3d87a8e8316ab20de455279a10b0ec72bfb6c6ce1e1085f8c6f288ead76
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x17d46fe53f1940fb20f0e227bbfc10e54f67ea5e36e81aa42869fa195882285e,
      0x1bb01895108cd5e2204dca4434b653fd1fd1688b3e23eff7f08c4f809f1d147c
    );
    vk.QECC = PairingsBn254.new_g1(
      0x0059439808da342f44ac71c90981d3f51b822aa5cac9f7c2c4774f9a9f6864c2,
      0x10d40613eacc3f0d56dd8c07c2cddb05c8f3ff433ef3ad62f542eb5d28d48756
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x15a32ff356c3659f4a0def8a608ee03580252fa09f5e30057224513e83a361b2,
      0x2b8e5582959457d4452b14ebd59176239a98480cba5a77838b1e8beb872a72e7
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x0ced13647118ce04f0817b111502594bfacf62b6933c756133fab87df9527a9b,
      0x26b76c96c076503d49aa491f0e2720cd51e1ba959732ad9e16bcdcaa76ec740d
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x15dc6afef5ffaaa3e38e00aba593aecc16d95f8191532b09f2377142bb837cb1,
      0x2b9ffb8aa28de98d6444eb7cc2c2ec361a7d7e10cb916fbcac905e28b2b6ac7d
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x15218a45924f43788772d31403dc4a7bb4da0c16ccc5a250267b9bd42b43ab8e,
      0x29831962a1e5589f7c4eefbf04de626131b247171ab9b1f6d9fe5377b7c005f7
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x2d9ef935ebdbcec47ea1ea8b7061610ef5fea549a022882aec71b8505d9924b6,
      0x2b26158060bf940f1c3d7bc0c6ea634af4d674a3bfd74f0a897fed0983e78fdb
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x12ad3fbd339e4824fdda2a83970b6d2e115a8ea95ebb62b96735dd6c821d35ab,
      0x267054414431ed7e735d6d36fd7b62467ab85ed95e03dd64dd196e975f1d49c2
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
    vk.recursive_proof_indices[0] = 34;
    vk.recursive_proof_indices[1] = 35;
    vk.recursive_proof_indices[2] = 36;
    vk.recursive_proof_indices[3] = 37;
    vk.recursive_proof_indices[4] = 38;
    vk.recursive_proof_indices[5] = 39;
    vk.recursive_proof_indices[6] = 40;
    vk.recursive_proof_indices[7] = 41;
    vk.recursive_proof_indices[8] = 42;
    vk.recursive_proof_indices[9] = 43;
    vk.recursive_proof_indices[10] = 44;
    vk.recursive_proof_indices[11] = 45;
    vk.recursive_proof_indices[12] = 46;
    vk.recursive_proof_indices[13] = 47;
    vk.recursive_proof_indices[14] = 48;
    vk.recursive_proof_indices[15] = 49;
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

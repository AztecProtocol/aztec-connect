// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from '../cryptography/Types.sol';
import {PairingsBn254} from '../cryptography/PairingsBn254.sol';

library Rollup3Vk {
  using PairingsBn254 for Types.G1Point;
  using PairingsBn254 for Types.G2Point;
  using PairingsBn254 for Types.Fr;

  function get_verification_key() internal pure returns (Types.VerificationKey memory) {
    Types.VerificationKey memory vk;

    vk.circuit_size = 4194304;
    vk.num_inputs = 59;
    vk.work_root = PairingsBn254.new_fr(
      0x1ad92f46b1f8d9a7cda0ceb68be08215ec1a1f05359eebbba76dde56a219447e
    );
    vk.domain_inverse = PairingsBn254.new_fr(
      0x30644db14ff7d4a4f1cf9ed5406a7e5722d273a7aa184eaa5e1fb0846829b041
    );
    vk.work_root_inverse = PairingsBn254.new_fr(
      0x2eb584390c74a876ecc11e9c6d3c38c3d437be9d4beced2343dc52e27faa1396
    );
    vk.Q1 = PairingsBn254.new_g1(
      0x13e8899eb39b7a1f2c4528fedcb09fcf51003aff1b1e4696fef03c9230affa44,
      0x116764f716db33beaf08785a3bfe8fd54dcaeec8d95d652d8d6dc544152db5b3
    );
    vk.Q2 = PairingsBn254.new_g1(
      0x0736b1b21559a50309e92a38243ae901b04d8cbe7bf41ef0bcb566edbcb68288,
      0x2777203a8dcaf281775acc4ed2cc1dba2f65f5cbe82607da1daf8b557718efb9
    );
    vk.Q3 = PairingsBn254.new_g1(
      0x15adc0187e920d8f4275445b961eabd767d0d0303b5891aa8ffc2b08d6d3a4ec,
      0x08846d0615c43929f6771c1cba67e4aa2b97d44d3b9b9cd785d8814a4dbfb031
    );
    vk.Q4 = PairingsBn254.new_g1(
      0x21fa803fa2ced36c75bbbae5a327684eacffa23b0105fd41d9cf8e83cc4a28a0,
      0x213d24464c569ac3c68ce7b65edae3811aec32066e71e1590daddc9ea6226e97
    );
    vk.Q5 = PairingsBn254.new_g1(
      0x077d56e8fdb7d55ab4ff500a47db48df8b8e9023450f8ac9cbf4b61e724e8ce9,
      0x2dc58258e717e0701dc1985481fb8e6c6fd1d1e9f65ab2929055018862fb4f6e
    );
    vk.QM = PairingsBn254.new_g1(
      0x03f22e5877f0cd62b5ed633f00e2755967518642f9d2c934b7b1ecb2f8fc87fd,
      0x090edcbde3719c066a3494d443a8bcc30feff0b47336509e25ecd45ce62b6954
    );
    vk.QC = PairingsBn254.new_g1(
      0x2a90ce2751df2da86bc0d125f7f63f9ecd1ac96b83c93acf0e86dc0bebd50b19,
      0x0476af9dac207360b33e04bbb7fd04f6150e22de96d621ed811c4c9f02b57aee
    );
    vk.QARITH = PairingsBn254.new_g1(
      0x2b307bb535d50e3dc917c6bd6b5df42bf6e73cb2436172d14e794b5d5891564c,
      0x0e72028e77d6ab8011b5977e034d802be350866d2c44a00ccbb61c65c9f790de
    );
    vk.QECC = PairingsBn254.new_g1(
      0x1c15c430bf2f3df39256d73d6e47992830667504cdddfaa747d85a36bcf886ac,
      0x025e8dffe6a3b10318548d21697b1a3294392e7a2a953cc7949b2842994a9328
    );
    vk.QRANGE = PairingsBn254.new_g1(
      0x216aa7420da158dbeb9a9ffe504e75ec8737da95bf3bc15536059f2d8b05792c,
      0x13627c751aeae285d5bd37fd5496da93ed2e11ea1294c21d56b5ec5819474e41
    );
    vk.QLOGIC = PairingsBn254.new_g1(
      0x1841e680d0f298a3e03dc8dbf01d1bbf764aaa4ed4efdd3c87c4b8db6124983b,
      0x2661bbb35770f1f93949ef6ea64a0a1fff80e3636243cba954dfd1acfbbac59c
    );
    vk.sigma_commitments[0] = PairingsBn254.new_g1(
      0x1c951256e605f1467079de82ff1bec8a218a93eda91d262fab02043242a3bbfd,
      0x138c614c5be0177569ace2f087b60dced3c4af9404aa9dead131bf925179d50c
    );
    vk.sigma_commitments[1] = PairingsBn254.new_g1(
      0x190be7f35178cddb8f7f3d07fbfbc4ccd8b1e14809d56ada105b979d1f2047e6,
      0x057b72aef1fa170c411e14e8d3962dc23684f12b81ee40f9999ffb450d4d687a
    );
    vk.sigma_commitments[2] = PairingsBn254.new_g1(
      0x18071a75e1a009ae9529036acf481175e839de493a2f022222a4799cf76db8d1,
      0x2daf34c0cabf13b228ed836cb14c9e11b0327083532149729064e0d49201f64b
    );
    vk.sigma_commitments[3] = PairingsBn254.new_g1(
      0x2c42e3f97d0ca62e132b6ca97886890dced78ac01fa26a0c3efaaefc8fb1ef4a,
      0x2374157d354ed102451ef0e0c666c244c762ba6e954017957629c5331c9f5f62
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

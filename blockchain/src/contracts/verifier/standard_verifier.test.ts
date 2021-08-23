import { ethers } from 'hardhat';
import { StandardVerifier } from './standard_verifier';
import { getStandardPlonkData } from './fixtures/get_standard_plonk_data';
import { EthersAdapter } from '../../provider';

describe('StandardVerifier', function () {
  let verifier: StandardVerifier;
  const gasLimit = 10000000;

  beforeAll(async () => {
    verifier = await StandardVerifier.deploy(new EthersAdapter(ethers.provider));
  });

  async function validate(inner: number, outer: number) {
    const proof = await getStandardPlonkData();
    const gasUsed = await verifier.verify(proof, 1, { gasLimit });

    // const proof = await getRollupData(inner, outer);
    // const proofData = RollupProofData.fromBuffer(proof);
    // const gasUsed = await verifier.verify(proof, proofData.rollupSize, { gasLimit });
    // // console.log(`gasUsed: ${gasUsed}`);
  }

  it('should validate a 1 rollup proof (1 tx)', async () => {
    await validate(1, 1);
  });

});

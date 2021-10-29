import { ethers } from 'hardhat';
import { StandardVerifier } from './standard_verifier';
import { getRollupData } from './fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';

describe('StandardVerifier', function () {
  let verifier: StandardVerifier;
  const gasLimit = 10000000;

  beforeAll(async () => {
    verifier = await StandardVerifier.deploy(new EthersAdapter(ethers.provider));
  });

  async function validate(inner: number, outer: number) {
    const { proofData, broadcastData, inputHash } = await getRollupData(inner, outer);
    const gasUsed = await verifier.verify(proofData, broadcastData.rollupSize, inputHash, { gasLimit });
   console.log(`gasUsed: ${gasUsed}`);
  }

  it('should validate a 2 rollup proof (1 tx)', async () => {
    await validate(1, 2);
  });

});

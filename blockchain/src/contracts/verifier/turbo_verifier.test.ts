import { ethers } from 'hardhat';
import { Verifier } from './turbo_verifier';
import { getRollupDataTurbo } from './fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';

describe('Verifier', function () {
  let verifier: Verifier;
  const gasLimit = 10000000;

  beforeAll(async () => {
    verifier = await Verifier.deploy(new EthersAdapter(ethers.provider));
  });

  async function validate(inner: number, outer: number) {
    const { proofData, broadcastData, inputHash } = await getRollupDataTurbo(inner, outer);
    const gasUsed = await verifier.verify(proofData, broadcastData.rollupSize, inputHash, { gasLimit });
    console.log(`gasUsed: ${gasUsed}`);
  }

  it('should validate a 1 rollup proof (1 tx)', async () => {
    await validate(1, 1);
  });

  it('should validate a 2 rollup proof (1 tx)', async () => {
    await validate(1, 2);
  });

  it('should validate a 4 rollup proof (2 tx)', async () => {
    await validate(1, 4);
  });

  it('should validate a 32 rollup proof (1 tx)', async () => {
    await validate(28, 1);
  });

  it('should validate a 64 rollup proof (1 tx)', async () => {
    await validate(28, 2);
  });

  it('should validate a 128 rollup proof (1 tx)', async () => {
    await validate(28, 4);
  });
});

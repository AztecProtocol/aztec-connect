import { ethers } from 'hardhat';
import { Verifier } from './verifier';
import { getRollupData } from './fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';

describe('Verifier', function () {
  let verifier: Verifier;
  const gasLimit = 10000000;

  beforeAll(async () => {
    verifier = await Verifier.deploy(new EthersAdapter(ethers.provider));
  });

  async function validate(inner: number, outer: number) {
    const { proof, proofData } = await getRollupData(inner, outer);
    const gasUsed = await verifier.verify(proof, proofData.rollupSize, proof.slice(0, 32), { gasLimit });
    console.log(`gasUsed: ${gasUsed}`);
  }

  it('should validate a 1 rollup proof (1 tx)', async () => {
    await validate(1, 1);
  });

  it('should validate a 2 rollup proof (1 tx)', async () => {
    await validate(1, 2);
  });

  it('should validate a 4 rollup proof (2 tx)', async () => {
    await validate(2, 2);
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

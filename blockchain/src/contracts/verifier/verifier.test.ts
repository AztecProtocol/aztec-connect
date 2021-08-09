import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { deployVerifier } from '../../deploy/deploy_verifier';
import { getRollupData } from './fixtures/get_rollup_data';

describe('Verifier', function () {
  let verifier: Contract;
  const gasLimit = 10000000;

  beforeAll(async () => {
    const [signer] = await ethers.getSigners();
    verifier = await deployVerifier(signer);
  });

  async function validate(inner: number, outer: number) {
    const proof = await getRollupData(inner, outer);
    const proofData = RollupProofData.fromBuffer(proof);
    const tx = await verifier.verify(proof, proofData.rollupSize, { gasLimit });
    const receipt = await tx.wait();
    console.log(`gasUsed: ${receipt.gasUsed.toString()}`);
    expect(receipt.status).toBe(1);
  }

  it('should validate a 1 rollup proof (1 tx)', async () => {
    await validate(1, 1);
  });

  it('should validate a 2 rollup proof (1 tx)', async () => {
    await validate(1, 2);
  });

  it('should validate a 4 rollup proof (1 tx)', async () => {
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

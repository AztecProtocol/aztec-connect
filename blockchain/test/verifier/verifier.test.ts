import { RollupProofData } from 'barretenberg/rollup_proof';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { deployVerifier } from '../../src/deploy/deploy_verifier';
import { getRollupData } from './fixtures/get_rollup_data';

use(solidity);

describe('Verifier', function () {
  this.timeout(120000);
  let verifier: Contract;
  const gasLimit = 10000000;

  before(async () => {
    const [signer] = await ethers.getSigners();
    verifier = await deployVerifier(signer);
  });

  async function validate(inner: number, outer: number) {
    const proof = await getRollupData(inner, outer);
    const proofData = RollupProofData.fromBuffer(proof);
    const tx = await verifier.verify(proof, proofData.rollupSize, { gasLimit });
    const receipt = await tx.wait();
    console.log(`gasUsed: ${receipt.gasUsed.toString()}`);
    expect(receipt.status).to.equal(1);
  }

  it('should validate a 32 rollup proof (1 tx)', async () => {
    await validate(28, 1);
  });

  it('should validate a 64 rollup proof (1 tx)', async () => {
    await validate(28, 2);
  });

  it('should validate a 128 rollup proof (1 tx)', async () => {
    await validate(28, 4);
  });

  it('should validate a 256 rollup proof (1 tx)', async () => {
    await validate(28, 8);
  });

  it('should validate a 512 rollup proof (1 tx)', async () => {
    await validate(28, 16);
  });

  it('should validate a 1024 rollup proof (896 txs)', async () => {
    await validate(28, 32);
  });
});

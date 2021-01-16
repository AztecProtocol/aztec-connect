import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { deployVerifier } from '../../src/deploy/deploy_verifier';
import { getRollupData } from '../fixtures/get_rollup_data';

use(solidity);

describe('Verifier', () => {
  let verifier: Contract;

  beforeEach(async () => {
    const [signer] = await ethers.getSigners();
    verifier = await deployVerifier(signer);
  });

  it('should validate a proof', async () => {
    const proof = await getRollupData();
    const rollupSize = 2;
    const tx = await verifier.verify(proof, rollupSize);
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  }).timeout(600000);
});

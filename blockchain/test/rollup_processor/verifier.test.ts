import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { deployVerifier } from '../../src/deploy/deploy_verifier';
import { setupRollupProcessor } from './fixtures/setup_rollup_processor';

use(solidity);

describe('rollup_processor: verifier', async () => {
  let rollupProcessor: Contract;

  beforeEach(async () => {
    const [, userA, rollupProvider] = await ethers.getSigners();
    ({ rollupProcessor } = await setupRollupProcessor(rollupProvider, [userA], 100));
  });

  it('should allow the owner to change the verifier address', async () => {
    const [signer] = await ethers.getSigners();
    const newVerifier = await deployVerifier(signer);
    const tx = await rollupProcessor.setVerifier(newVerifier.address);
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
    const newAddress = await rollupProcessor.verifier.call();
    expect(newAddress).to.equal(newVerifier.address);
  });

  it('should not be able to set the verifier if not the owner', async () => {
    const [signer, userA] = await ethers.getSigners();
    const newVerifier = await deployVerifier(signer);
    const userARollupContract = await rollupProcessor.connect(userA);
    await expect(userARollupContract.setVerifier(newVerifier.address)).to.be.reverted;
  });
});

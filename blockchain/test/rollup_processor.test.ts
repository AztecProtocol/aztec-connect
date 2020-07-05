import { ethers } from '@nomiclabs/buidler';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import {
  createDepositProof,
  createWithdrawProof,
  newDataRoot,
  newDataRootsRoot,
  newNullifierRoot,
} from './fixtures/create_proof';

import { Contract } from 'ethers';

use(solidity);

describe('rollup_processor', () => {
  let rollupProcessor!: Contract;
  let erc20!: Contract;
  let userAAddress!: string;
  let userBAddress!: string;

  const mintAmount = 100;
  const depositAmount = 60;
  const withdrawalAmount = 20;
  const scalingFactor = 1;

  const viewingKeys = [Buffer.alloc(176, 1), Buffer.alloc(176, 2)];
  const rollupSize = 2;

  beforeEach(async () => {
    const [userA, userB] = await ethers.getSigners();
    userAAddress = await userA.getAddress();
    userBAddress = await userB.getAddress();

    const ERC20 = await ethers.getContractFactory('ERC20Mintable');
    erc20 = await ERC20.deploy();

    const RollupProcessor = await ethers.getContractFactory('RollupProcessor');
    rollupProcessor = await RollupProcessor.deploy(erc20.address, scalingFactor);
    // mint users tokens for testing
    await erc20.mint(userAAddress, mintAmount);
    await erc20.mint(userBAddress, mintAmount);
  });

  describe('Deposit, transfer and withdrawal', async () => {
    it('should process a rollup', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);
      await erc20.approve(rollupProcessor.address, depositAmount);
      const tx = await rollupProcessor.processRollup(proofData, viewingKeys, rollupSize);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should deposit value into rollup', async () => {
      const initialRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(initialRollupBalance).to.equal(ethers.BigNumber.from(0));

      const proofData = createDepositProof(depositAmount, userAAddress);
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.processRollup(proofData, viewingKeys, rollupSize);

      const postDepositRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postDepositRollupBalance).to.equal(initialRollupBalance + depositAmount);

      const postDepositUserBalance = await erc20.balanceOf(userAAddress);
      expect(postDepositUserBalance).to.equal(mintAmount - depositAmount);
    });

    it('should withdraw value from rollup to original user', async () => {
      const depositProofData = createDepositProof(depositAmount, userAAddress);
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.processRollup(depositProofData, viewingKeys, rollupSize);

      const withdrawalProofData = createWithdrawProof(withdrawalAmount, userAAddress);
      await rollupProcessor.processRollup(withdrawalProofData, viewingKeys, rollupSize);

      const postWithdrawalRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postWithdrawalRollupBalance).to.equal(depositAmount - withdrawalAmount);

      const postWithdrawalBalance = await erc20.balanceOf(userAAddress);
      expect(postWithdrawalBalance).to.equal(mintAmount - depositAmount + withdrawalAmount);
    });

    it('should withdraw value from rollup to different user', async () => {
      const depositProofData = createDepositProof(depositAmount, userAAddress);
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.processRollup(depositProofData, viewingKeys, rollupSize);

      const withdrawalProofData = createWithdrawProof(withdrawalAmount, userBAddress);
      await rollupProcessor.processRollup(withdrawalProofData, viewingKeys, rollupSize);

      const postWithdrawalRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postWithdrawalRollupBalance).to.equal(depositAmount - withdrawalAmount);

      const userAPostWithdrawal = await erc20.balanceOf(userAAddress);
      expect(userAPostWithdrawal).to.equal(mintAmount - depositAmount);

      const userBPostWithdrawal = await erc20.balanceOf(userBAddress);
      expect(userBPostWithdrawal).to.equal(mintAmount + withdrawalAmount);
    });
  });

  describe('Merkle roots', async () => {
    it('should update Merkle root state', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);

      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.processRollup(proofData, viewingKeys, rollupSize);

      const dataRoot = await rollupProcessor.dataRoot();
      const nullRoot = await rollupProcessor.nullRoot();
      const rootRoot = await rollupProcessor.rootRoot();

      expect(dataRoot.slice(2)).to.equal(newDataRoot.toString('hex'));
      expect(nullRoot.slice(2)).to.equal(newNullifierRoot.toString('hex'));
      expect(rootRoot.slice(2)).to.equal(newDataRootsRoot.toString('hex'));
    });

    it('should reject for non-sequential rollupId', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);
      proofData.write(randomBytes(32).toString('hex'), 0); // make ID non-sequential
      await expect(rollupProcessor.processRollup(proofData, viewingKeys, rollupSize)).to.be.revertedWith(
        'Rollup Processor: ID_NOT_SEQUENTIAL',
      );
    });

    it('should reject for malformed old data root', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);
      proofData.write(randomBytes(32).toString('hex'), 32 * 2); // malform oldDataRoot
      await expect(rollupProcessor.processRollup(proofData, viewingKeys, rollupSize)).to.be.revertedWith(
        'Rollup Processor: INCORRECT_DATA_ROOT',
      );
    });

    it('should reject for malformed old nullifier root', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);
      proofData.write(randomBytes(32).toString('hex'), 32 * 4); // malform oldNullRoot
      await expect(rollupProcessor.processRollup(proofData, viewingKeys, rollupSize)).to.be.revertedWith(
        'Rollup Processor: INCORRECT_NULL_ROOT',
      );
    });

    it('should reject for malformed root root', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);
      proofData.write(randomBytes(32).toString('hex'), 32 * 6); // malform oldNullRoot
      await expect(rollupProcessor.processRollup(proofData, viewingKeys, rollupSize)).to.be.revertedWith(
        'Rollup Processor: INCORRECT_ROOT_ROOT',
      );
    });
  });
});

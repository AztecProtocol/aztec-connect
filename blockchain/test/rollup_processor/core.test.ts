import { ethers } from '@nomiclabs/buidler';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';

import {
  createDepositProof,
  createSendProof,
  createTwoDepositsProof,
  createWithdrawProof,
  newDataRoot,
  newDataRootsRoot,
  newNullifierRoot,
} from '../fixtures/create_mock_proof';
import { solidityFormatSignatures } from '../signing/solidity_format_sigs';

use(solidity);

describe('rollup_processor: core', () => {
  let rollupProcessor: Contract;
  let erc20: Contract;
  let userA: Signer;
  let userB: Signer;
  let userAAddress: string;
  let userBAddress: string;

  const mintAmount = 100;
  const depositAmount = 60;
  const withdrawalAmount = 20;

  const viewingKeys = [Buffer.alloc(32, 1), Buffer.alloc(32, 2)];
  const rollupSize = 2;

  beforeEach(async () => {
    [userA, userB] = await ethers.getSigners();
    userAAddress = await userA.getAddress();
    userBAddress = await userB.getAddress();

    const ERC20 = await ethers.getContractFactory('ERC20Mintable');
    erc20 = await ERC20.deploy();

    const MockVerifier = await ethers.getContractFactory('MockVerifier');
    const mockVerifier = await MockVerifier.deploy();

    const RollupProcessor = await ethers.getContractFactory('RollupProcessor');
    rollupProcessor = await RollupProcessor.deploy(erc20.address, mockVerifier.address);

    // mint users tokens for testing
    await erc20.mint(userAAddress, mintAmount);
    await erc20.mint(userBAddress, mintAmount);
  });

  describe('Deposit, transfer and withdrawal', async () => {
    it('should process a rollup', async () => {
      const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
      await erc20.approve(rollupProcessor.address, depositAmount);
      const tx = await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        viewingKeys,
        rollupSize,
      );
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should deposit value into rollup', async () => {
      const initialRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(initialRollupBalance).to.equal(ethers.BigNumber.from(0));

      const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        viewingKeys,
        rollupSize,
      );

      const postDepositRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postDepositRollupBalance).to.equal(initialRollupBalance + depositAmount);

      const postDepositUserBalance = await erc20.balanceOf(userAAddress);
      expect(postDepositUserBalance).to.equal(mintAmount - depositAmount);
    });

    it('should withdraw value from rollup to original user', async () => {
      const {
        proofData: depositProofData,
        signatures: depositSignatures,
        sigIndexes: depositSigIndexes,
      } = await createDepositProof(depositAmount, userAAddress, userA);
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.processRollup(
        depositProofData,
        solidityFormatSignatures(depositSignatures),
        depositSigIndexes,
        viewingKeys,
        rollupSize,
      );

      const {
        proofData: withdrawalProofData,
        signatures: withdrawalSignatures,
        sigIndexes: withdrawalSigIndexes,
      } = await createWithdrawProof(withdrawalAmount, userAAddress);
      await rollupProcessor.processRollup(
        withdrawalProofData,
        solidityFormatSignatures(withdrawalSignatures),
        withdrawalSigIndexes,
        viewingKeys,
        rollupSize,
      );

      const postWithdrawalRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postWithdrawalRollupBalance).to.equal(depositAmount - withdrawalAmount);

      const postWithdrawalBalance = await erc20.balanceOf(userAAddress);
      expect(postWithdrawalBalance).to.equal(mintAmount - depositAmount + withdrawalAmount);
    });

    it('should withdraw value from rollup to different user', async () => {
      const {
        proofData: depositProofData,
        signatures: depositSignatures,
        sigIndexes: depositSigIndexes,
      } = await createDepositProof(depositAmount, userAAddress, userA);
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.processRollup(
        depositProofData,
        solidityFormatSignatures(depositSignatures),
        depositSigIndexes,
        viewingKeys,
        rollupSize,
      );

      const {
        proofData: withdrawalProofData,
        signatures: withdrawalSignatures,
        sigIndexes: withdrawalSigIndexes,
      } = await createWithdrawProof(withdrawalAmount, userBAddress);
      await rollupProcessor.processRollup(
        withdrawalProofData,
        solidityFormatSignatures(withdrawalSignatures),
        withdrawalSigIndexes,
        viewingKeys,
        rollupSize,
      );

      const postWithdrawalRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postWithdrawalRollupBalance).to.equal(depositAmount - withdrawalAmount);

      const userAPostWithdrawal = await erc20.balanceOf(userAAddress);
      expect(userAPostWithdrawal).to.equal(mintAmount - depositAmount);

      const userBPostWithdrawal = await erc20.balanceOf(userBAddress);
      expect(userBPostWithdrawal).to.equal(mintAmount + withdrawalAmount);
    });

    it('should process private send proof without requiring signatures', async () => {
      const { proofData } = await createSendProof();
      const tx = await rollupProcessor.processRollup(proofData, Buffer.alloc(32), [], viewingKeys, rollupSize);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should reject processrollup() if not owner', async () => {
      // owner is address that deployed contract - userA
      const { proofData } = await createSendProof();
      await expect(
        rollupProcessor.connect(userB).processRollup(proofData, Buffer.alloc(32), [], viewingKeys, rollupSize),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('Multi transaction rollup', async () => {
    it('should process user A deposit tx and user B deposit tx in one rollup', async () => {
      const initialUserABalance = await erc20.balanceOf(userAAddress);
      expect(initialUserABalance).to.equal(mintAmount);

      const initialUserBBalance = await erc20.balanceOf(userAAddress);
      expect(initialUserBBalance).to.equal(mintAmount);

      const initialContractBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(initialContractBalance).to.equal(0);

      const userBDepositAmount = 15;
      const fourViewingKeys = [Buffer.alloc(32, 1), Buffer.alloc(32, 2), Buffer.alloc(32, 3), Buffer.alloc(32, 4)];

      // transfer tokens from userA to contract, and then also withdraw those funds to
      const { proofData, signatures, sigIndexes } = await createTwoDepositsProof(
        depositAmount,
        userAAddress,
        userA,

        userBDepositAmount,
        userBAddress,
        userB,
      );

      await erc20.approve(rollupProcessor.address, depositAmount);
      await erc20.connect(userB).approve(rollupProcessor.address, userBDepositAmount);
      await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        fourViewingKeys,
        rollupSize,
      );

      const postDepositUserABalance = await erc20.balanceOf(userAAddress);
      expect(postDepositUserABalance).to.equal(initialUserABalance - depositAmount);

      const postDepositUserBBalance = await erc20.balanceOf(userBAddress);
      expect(postDepositUserBBalance).to.equal(initialUserBBalance - userBDepositAmount);

      const postDepositContractBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postDepositContractBalance).to.equal(
        parseInt(initialContractBalance, 10) + depositAmount + userBDepositAmount,
      );
    });
  });

  describe('Merkle roots', async () => {
    it('should update Merkle root state', async () => {
      const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);

      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        viewingKeys,
        rollupSize,
      );

      const dataRoot = await rollupProcessor.dataRoot();
      const nullRoot = await rollupProcessor.nullRoot();
      const rootRoot = await rollupProcessor.rootRoot();

      expect(dataRoot.slice(2)).to.equal(newDataRoot.toString('hex'));
      expect(nullRoot.slice(2)).to.equal(newNullifierRoot.toString('hex'));
      expect(rootRoot.slice(2)).to.equal(newDataRootsRoot.toString('hex'));
    });

    it('should reject for non-sequential rollupId', async () => {
      const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
      proofData.write(randomBytes(32).toString('hex'), 0); // make ID non-sequential
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          viewingKeys,
          rollupSize,
        ),
      ).to.be.revertedWith('Rollup Processor: ID_NOT_SEQUENTIAL');
    });

    it('should reject for malformed old data root', async () => {
      const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
      proofData.write(randomBytes(32).toString('hex'), 32 * 2); // malform oldDataRoot
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          viewingKeys,
          rollupSize,
        ),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_DATA_ROOT');
    });

    it('should reject for malformed old nullifier root', async () => {
      const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
      proofData.write(randomBytes(32).toString('hex'), 32 * 4); // malform oldNullRoot
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          viewingKeys,
          rollupSize,
        ),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_NULL_ROOT');
    });

    it('should reject for malformed root root', async () => {
      const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
      proofData.write(randomBytes(32).toString('hex'), 32 * 6); // malform oldNullRoot
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          viewingKeys,
          rollupSize,
        ),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_ROOT_ROOT');
    });
  });
});

import { EthAddress } from 'barretenberg/address';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import {
  createDepositProof,
  createRollupProof,
  createSendProof,
  createTwoDepositsProof,
  createWithdrawProof,
  newDataRoot,
  newDataRootsRoot,
  newNullifierRoot,
  numToBuffer,
} from '../fixtures/create_mock_proof';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';
import { solidityFormatSignatures } from '../signing/solidity_format_sigs';

use(solidity);

const randInt = () => {
  return Math.floor(Math.random() * 1000);
};

describe('rollup_processor: core', () => {
  let rollupProcessor: Contract;
  let erc20: Contract;
  let userA: Signer;
  let userB: Signer;
  let rollupProvider: Signer;
  let rollupProviderAddress: EthAddress;
  let userAAddress: EthAddress;
  let userBAddress: EthAddress;
  let viewingKeys: Buffer[];
  let erc20AssetId: number;
  let ethAssetId: number;

  const mintAmount = 100;
  const depositAmount = 60;
  const withdrawalAmount = 20;

  beforeEach(async () => {
    [userA, userB, rollupProvider] = await ethers.getSigners();
    rollupProviderAddress = EthAddress.fromString(await rollupProvider.getAddress());
    userAAddress = EthAddress.fromString(await userA.getAddress());
    userBAddress = EthAddress.fromString(await userB.getAddress());
    ({ erc20, rollupProcessor, viewingKeys, ethAssetId, erc20AssetId } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
    ));
  });

  describe('Deposit, transfer and withdrawal', async () => {
    it('should deposit funds into the rollup contract', async () => {
      const initialRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(initialRollupBalance).to.equal(0);

      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

      const postDepositRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postDepositRollupBalance).to.equal(depositAmount);

      const userPublicBalance = await rollupProcessor.getUserPendingDeposit(erc20AssetId, userAAddress.toString());
      expect(userPublicBalance).to.equal(depositAmount);
    });

    it('should deposit eth into the rollup contract', async () => {
      const provider = userA.provider!;
      const initialRollupEthBalance = await provider.getBalance(rollupProcessor.address);
      expect(initialRollupEthBalance).to.equal(0);

      await rollupProcessor.depositPendingFunds(ethAssetId, depositAmount, userAAddress.toString(), {
        value: depositAmount,
      });

      const userEthBalance = await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString());
      expect(userEthBalance).to.equal(depositAmount);

      const postDepositRollupEthBalance = await provider.getBalance(rollupProcessor.address);
      expect(postDepositRollupEthBalance).to.equal(depositAmount);

      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId),
      );

      await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
      );

      const userEthBalanceAfter = await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString());
      expect(userEthBalanceAfter).to.equal(0);
    });

    it('should deposit value via a rollup', async () => {
      const initialRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(initialRollupBalance).to.equal(ethers.BigNumber.from(0));

      const initialUserPublicBalance = await rollupProcessor.getUserPendingDeposit(
        erc20AssetId,
        userAAddress.toString(),
      );
      expect(initialUserPublicBalance).to.equal(0);

      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

      const postDepositUserPublicBalance = await rollupProcessor.getUserPendingDeposit(
        erc20AssetId,
        userAAddress.toString(),
      );
      expect(postDepositUserPublicBalance).to.equal(depositAmount);

      await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
      );

      const postRollupUserPublicBalance = await rollupProcessor.getUserPendingDeposit(
        erc20AssetId,
        userAAddress.toString(),
      );
      expect(postRollupUserPublicBalance).to.equal(0);

      const postDepositRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postDepositRollupBalance).to.equal(initialRollupBalance + depositAmount);

      const postDepositUserBalance = await erc20.balanceOf(userAAddress.toString());
      expect(postDepositUserBalance).to.equal(mintAmount - depositAmount);
    });

    it('should withdraw value from rollup to original user', async () => {
      const {
        proofData: depositProofData,
        signatures: depositSignatures,
        sigIndexes: depositSigIndexes,
      } = await createRollupProof(rollupProvider, await createDepositProof(depositAmount, userAAddress, userA));
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
      await rollupProcessor.processRollup(
        depositProofData,
        solidityFormatSignatures(depositSignatures),
        depositSigIndexes,
        Buffer.concat(viewingKeys),
      );

      const {
        proofData: withdrawalProofData,
        signatures: withdrawalSignatures,
        sigIndexes: withdrawalSigIndexes,
      } = await createRollupProof(rollupProvider, await createWithdrawProof(withdrawalAmount, userAAddress), 1);
      await rollupProcessor.processRollup(
        withdrawalProofData,
        solidityFormatSignatures(withdrawalSignatures),
        withdrawalSigIndexes,
        Buffer.concat(viewingKeys),
      );

      const postWithdrawUserPublicBalance = await rollupProcessor.getUserPendingDeposit(
        erc20AssetId,
        userAAddress.toString(),
      );
      expect(postWithdrawUserPublicBalance).to.equal(0);

      const postWithdrawalRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postWithdrawalRollupBalance).to.equal(depositAmount - withdrawalAmount);

      const postWithdrawalBalance = await erc20.balanceOf(userAAddress.toString());
      expect(postWithdrawalBalance).to.equal(mintAmount - depositAmount + withdrawalAmount);
    });

    it('should withdraw eth from rollup contract', async () => {
      const provider = userA.provider!;

      // Deposit
      await rollupProcessor.depositPendingFunds(ethAssetId, depositAmount, userAAddress.toString(), {
        value: depositAmount,
      });

      const {
        proofData: depositProofData,
        signatures: depositSignatures,
        sigIndexes: depositSigIndexes,
      } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId),
      );

      await rollupProcessor.processRollup(
        depositProofData,
        solidityFormatSignatures(depositSignatures),
        depositSigIndexes,
        Buffer.concat(viewingKeys),
      );

      expect(await provider.getBalance(rollupProcessor.address)).to.equal(BigInt(depositAmount));

      const userBalanceAfterDeposit = BigInt(await provider.getBalance(userAAddress.toString()));

      // Withdraw
      const {
        proofData: withdrawalProofData,
        signatures: withdrawalSignatures,
        sigIndexes: withdrawalSigIndexes,
      } = await createRollupProof(
        rollupProvider,
        await createWithdrawProof(withdrawalAmount, userAAddress, ethAssetId),
        1,
      );
      await rollupProcessor.processRollup(
        withdrawalProofData,
        solidityFormatSignatures(withdrawalSignatures),
        withdrawalSigIndexes,
        Buffer.concat(viewingKeys),
      );

      expect(await provider.getBalance(rollupProcessor.address)).to.equal(BigInt(depositAmount - withdrawalAmount));

      const userBalanceAfterWithdraw = BigInt(await provider.getBalance(userAAddress.toString()));
      expect(userBalanceAfterWithdraw).to.equal(userBalanceAfterDeposit + BigInt(withdrawalAmount));
    });

    it('should withdraw value from rollup to different user', async () => {
      const {
        proofData: depositProofData,
        signatures: depositSignatures,
        sigIndexes: depositSigIndexes,
      } = await createRollupProof(rollupProvider, await createDepositProof(depositAmount, userAAddress, userA));
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
      await rollupProcessor.processRollup(
        depositProofData,
        solidityFormatSignatures(depositSignatures),
        depositSigIndexes,
        Buffer.concat(viewingKeys),
      );

      const {
        proofData: withdrawalProofData,
        signatures: withdrawalSignatures,
        sigIndexes: withdrawalSigIndexes,
      } = await createRollupProof(rollupProvider, await createWithdrawProof(withdrawalAmount, userBAddress), 1);
      await rollupProcessor.processRollup(
        withdrawalProofData,
        solidityFormatSignatures(withdrawalSignatures),
        withdrawalSigIndexes,
        Buffer.concat(viewingKeys),
      );

      const postWithdrawalRollupBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postWithdrawalRollupBalance).to.equal(depositAmount - withdrawalAmount);
      const userAPostWithdrawal = await erc20.balanceOf(userAAddress.toString());
      expect(userAPostWithdrawal).to.equal(mintAmount - depositAmount);
      const userBPostWithdrawal = await erc20.balanceOf(userBAddress.toString());
      expect(userBPostWithdrawal).to.equal(mintAmount + withdrawalAmount);
    });

    it('should process private send proof without requiring signatures', async () => {
      const { proofData } = await createRollupProof(rollupProvider, await createSendProof());
      const tx = await rollupProcessor.processRollup(proofData, Buffer.alloc(32), [], Buffer.concat(viewingKeys));
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should allow any address to send processRollup() tx', async () => {
      // owner is address that deployed contract - userA. Send with user B
      const { proofData } = await createRollupProof(rollupProvider, await createSendProof());
      const tx = await rollupProcessor
        .connect(userB)
        .processRollup(proofData, Buffer.alloc(32), [], Buffer.concat(viewingKeys));
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should reject rollup if sufficient deposit not performed', async () => {
      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount - 1, userAAddress.toString());
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          Buffer.concat(viewingKeys),
        ),
      ).to.be.revertedWith('Rollup Processor: INSUFFICIENT_DEPOSIT');
    });
  });

  describe('Multi transaction rollup', async () => {
    it('should process user A deposit tx and user B deposit tx in one rollup', async () => {
      const initialUserABalance = await erc20.balanceOf(userAAddress.toString());
      expect(initialUserABalance).to.equal(mintAmount);

      const initialUserBBalance = await erc20.balanceOf(userBAddress.toString());
      expect(initialUserBBalance).to.equal(mintAmount);

      const initialContractBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(initialContractBalance).to.equal(0);

      const userBDepositAmount = 15;
      const fourViewingKeys = [Buffer.alloc(32, 1), Buffer.alloc(32, 2), Buffer.alloc(32, 3), Buffer.alloc(32, 4)];

      // transfer tokens from userA to contract, and then also withdraw those funds to
      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createTwoDepositsProof(
          depositAmount,
          userAAddress,
          userA,
          numToBuffer(erc20AssetId),
          userBDepositAmount,
          userBAddress,
          userB,
          numToBuffer(erc20AssetId),
        ),
      );

      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

      await erc20.connect(userB).approve(rollupProcessor.address, userBDepositAmount);
      await rollupProcessor
        .connect(userB)
        .depositPendingFunds(erc20AssetId, userBDepositAmount, userBAddress.toString());

      await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(fourViewingKeys),
      );

      const postDepositUserABalance = await erc20.balanceOf(userAAddress.toString());
      expect(postDepositUserABalance).to.equal(initialUserABalance - depositAmount);

      const postDepositUserBBalance = await erc20.balanceOf(userBAddress.toString());
      expect(postDepositUserBBalance).to.equal(initialUserBBalance - userBDepositAmount);

      const postDepositContractBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postDepositContractBalance).to.equal(
        parseInt(initialContractBalance, 10) + depositAmount + userBDepositAmount,
      );
    });
  });

  describe('Merkle roots', async () => {
    it('should update Merkle root state', async () => {
      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );

      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
      await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
      );

      const dataRoot = await rollupProcessor.dataRoot();
      const nullRoot = await rollupProcessor.nullRoot();
      const rootRoot = await rollupProcessor.rootRoot();

      expect(dataRoot.slice(2)).to.equal(newDataRoot.toString('hex'));
      expect(nullRoot.slice(2)).to.equal(newNullifierRoot.toString('hex'));
      expect(rootRoot.slice(2)).to.equal(newDataRootsRoot.toString('hex'));
    });

    it('should reject for non-sequential rollupId', async () => {
      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 0); // make ID non-sequential
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          Buffer.concat(viewingKeys),
        ),
      ).to.be.revertedWith('Rollup Processor: ID_NOT_SEQUENTIAL');
    });

    it('should reject for malformed data start index', async () => {
      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 32 * 2); // malform data start index
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          Buffer.concat(viewingKeys),
        ),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_DATA_START_INDEX');
    });

    it('should reject for malformed old data root', async () => {
      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 32 * 3); // malform data start index
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          Buffer.concat(viewingKeys),
        ),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_DATA_ROOT');
    });

    it('should reject for malformed old nullifier root', async () => {
      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 32 * 5); // malform oldNullRoot
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          Buffer.concat(viewingKeys),
        ),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_NULL_ROOT');
    });

    it('should reject for malformed root root', async () => {
      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 32 * 7); // malform oldRootRoot
      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          sigIndexes,
          Buffer.concat(viewingKeys),
        ),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_ROOT_ROOT');
    });
  });

  describe('Transactions with fee', () => {
    it('should deposit eth via a rollup with fee', async () => {
      const provider = userA.provider!;
      const txFee = 10;
      const publicInput = depositAmount + txFee;

      expect(await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString())).to.equal(0);
      expect(await provider.getBalance(rollupProcessor.address)).to.equal(0);

      await rollupProcessor.depositPendingFunds(ethAssetId, publicInput, userAAddress.toString(), {
        value: publicInput,
      });

      expect(await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString())).to.equal(publicInput);
      expect(await provider.getBalance(rollupProcessor.address)).to.equal(publicInput);

      const { proofData, signatures, sigIndexes } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId, txFee),
      );

      const providerInitialBalance = await provider.getBalance(rollupProviderAddress.toString());

      const tx = await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
        { from: rollupProviderAddress.toString() },
      );
      const receipt = await rollupProvider.provider!.getTransactionReceipt(tx.hash);
      const gasCost = receipt.gasUsed.mul(tx.gasPrice);

      expect(await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString())).to.equal(0);
      expect(await provider.getBalance(rollupProcessor.address)).to.equal(depositAmount);
      expect(await provider.getBalance(rollupProviderAddress.toString())).to.equal(
        BigInt(providerInitialBalance) + BigInt(txFee) - BigInt(gasCost),
      );
    });
  });
});

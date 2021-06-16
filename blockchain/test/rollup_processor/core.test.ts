import { EthAddress } from 'barretenberg/address';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { solidityFormatSignatures } from '../../src/solidity_format_signatures';
import {
  createDepositProof,
  createRollupProof,
  createSendProof,
  createWithdrawProof,
  dataRootRoots,
  dataRoots,
  mergeInnerProofs,
  nullifierRoots,
} from '../fixtures/create_mock_proof';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';

use(solidity);

const randInt = () => {
  return Math.floor(Math.random() * 1000);
};

describe('rollup_processor: core', () => {
  let rollupProcessor: Contract;
  let feeDistributor: Contract;
  let erc20: Contract;
  let userA: Signer;
  let userB: Signer;
  let rollupProvider: Signer;
  let rollupProviderAddress: EthAddress;
  let feeDistributorAddress: EthAddress;
  let userAAddress: EthAddress;
  let userBAddress: EthAddress;
  let viewingKeys: Buffer[];
  let erc20AssetId: number;
  let ethAssetId: number;

  const mintAmount = 100n;
  const depositAmount = 60n;
  const withdrawalAmount = 20n;

  beforeEach(async () => {
    [userA, userB, rollupProvider] = await ethers.getSigners();
    rollupProviderAddress = EthAddress.fromString(await rollupProvider.getAddress());
    userAAddress = EthAddress.fromString(await userA.getAddress());
    userBAddress = EthAddress.fromString(await userB.getAddress());
    ({ erc20, rollupProcessor, feeDistributor, viewingKeys, ethAssetId, erc20AssetId } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
    ));
    feeDistributorAddress = EthAddress.fromString(feeDistributor.address);
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

      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId),
      );

      await rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys));

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

      const { proofData, signatures } = await createRollupProof(
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

      await rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys));

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
      const { proofData: depositProofData, signatures: depositSignatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
      await rollupProcessor.escapeHatch(
        depositProofData,
        solidityFormatSignatures(depositSignatures),
        Buffer.concat(viewingKeys),
      );

      const { proofData: withdrawalProofData, signatures: withdrawalSignatures } = await createRollupProof(
        rollupProvider,
        await createWithdrawProof(withdrawalAmount, userAAddress),
        {
          rollupId: 1,
        },
      );
      await rollupProcessor.escapeHatch(
        withdrawalProofData,
        solidityFormatSignatures(withdrawalSignatures),
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
      {
        await rollupProcessor.depositPendingFunds(ethAssetId, depositAmount, userAAddress.toString(), {
          value: depositAmount,
        });

        const { proofData, signatures } = await createRollupProof(
          rollupProvider,
          await createDepositProof(depositAmount, userAAddress, userA, ethAssetId),
        );

        await rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys));

        expect(await provider.getBalance(rollupProcessor.address)).to.equal(depositAmount);
      }

      // Withdraw
      {
        const userBalance = BigInt((await provider.getBalance(userAAddress.toString())).toString());

        const { proofData, signatures } = await createRollupProof(
          rollupProvider,
          await createWithdrawProof(withdrawalAmount, userAAddress, ethAssetId),
          {
            rollupId: 1,
          },
        );
        await rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys));

        expect(await provider.getBalance(rollupProcessor.address)).to.equal(depositAmount - withdrawalAmount);

        const userBalanceAfterWithdraw = BigInt((await provider.getBalance(userAAddress.toString())).toString());
        expect(userBalanceAfterWithdraw).to.equal(userBalance + withdrawalAmount);
      }
    });

    it('should withdraw value from rollup to different user', async () => {
      const { proofData: depositProofData, signatures: depositSignatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
      await rollupProcessor.escapeHatch(
        depositProofData,
        solidityFormatSignatures(depositSignatures),
        Buffer.concat(viewingKeys),
      );

      const { proofData: withdrawalProofData, signatures: withdrawalSignatures } = await createRollupProof(
        rollupProvider,
        await createWithdrawProof(withdrawalAmount, userBAddress),
        {
          rollupId: 1,
        },
      );
      await rollupProcessor.escapeHatch(
        withdrawalProofData,
        solidityFormatSignatures(withdrawalSignatures),
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
      const tx = await rollupProcessor.escapeHatch(proofData, [], Buffer.concat(viewingKeys));
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should allow any address to send escapeHatch() tx', async () => {
      // owner is address that deployed contract - userA. Send with user B
      const { proofData } = await createRollupProof(rollupProvider, await createSendProof());
      const tx = await rollupProcessor.connect(userB).escapeHatch(proofData, [], Buffer.concat(viewingKeys));
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should reject rollup if sufficient deposit not performed', async () => {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount - 1n, userAAddress.toString());
      await expect(
        rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys)),
      ).to.be.revertedWith('Rollup Processor: INSUFFICIENT_DEPOSIT');
    });
  });

  describe('Multi transaction rollup', async () => {
    it('should process user A deposit tx and user B deposit tx in one rollup', async () => {
      const initialUserABalance = BigInt(await erc20.balanceOf(userAAddress.toString()));
      expect(initialUserABalance).to.equal(mintAmount);

      const initialUserBBalance = BigInt(await erc20.balanceOf(userBAddress.toString()));
      expect(initialUserBBalance).to.equal(mintAmount);

      const initialContractBalance = BigInt(await erc20.balanceOf(rollupProcessor.address));
      expect(initialContractBalance).to.equal(0n);

      const userBDepositAmount = 15n;
      const fourViewingKeys = [Buffer.alloc(32, 1), Buffer.alloc(32, 2), Buffer.alloc(32, 3), Buffer.alloc(32, 4)];

      // transfer tokens from userA to contract, and then also withdraw those funds to
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        mergeInnerProofs([
          await createDepositProof(depositAmount, userAAddress, userA, erc20AssetId),
          await createDepositProof(userBDepositAmount, userBAddress, userB, erc20AssetId),
        ]),
      );

      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

      await erc20.connect(userB).approve(rollupProcessor.address, userBDepositAmount);
      await rollupProcessor
        .connect(userB)
        .depositPendingFunds(erc20AssetId, userBDepositAmount, userBAddress.toString());

      await rollupProcessor.escapeHatch(
        proofData,
        solidityFormatSignatures(signatures),
        Buffer.concat(fourViewingKeys),
      );

      const postDepositUserABalance = await erc20.balanceOf(userAAddress.toString());
      expect(postDepositUserABalance).to.equal(initialUserABalance - depositAmount);

      const postDepositUserBBalance = await erc20.balanceOf(userBAddress.toString());
      expect(postDepositUserBBalance).to.equal(initialUserBBalance - userBDepositAmount);

      const postDepositContractBalance = await erc20.balanceOf(rollupProcessor.address);
      expect(postDepositContractBalance).to.equal(initialContractBalance + depositAmount + userBDepositAmount);
    });
  });

  describe('Merkle roots', async () => {
    it('should update Merkle root state', async () => {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );

      await erc20.approve(rollupProcessor.address, depositAmount);
      await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
      await rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys));

      const dataRoot = await rollupProcessor.dataRoot();
      const nullRoot = await rollupProcessor.nullRoot();
      const rootRoot = await rollupProcessor.rootRoot();

      expect(dataRoot.slice(2)).to.equal(dataRoots[1].toString('hex'));
      expect(nullRoot.slice(2)).to.equal(nullifierRoots[1].toString('hex'));
      expect(rootRoot.slice(2)).to.equal(dataRootRoots[1].toString('hex'));
    });

    it('should reject for non-sequential rollupId', async () => {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 0); // make ID non-sequential
      await expect(
        rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys)),
      ).to.be.revertedWith('Rollup Processor: ID_NOT_SEQUENTIAL');
    });

    it('should reject for malformed data start index', async () => {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 32 * 2); // malform data start index
      await expect(
        rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys)),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_DATA_START_INDEX');
    });

    it('should reject for malformed old data root', async () => {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 32 * 3); // malform data start index
      await expect(
        rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys)),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_DATA_ROOT');
    });

    it('should reject for malformed old nullifier root', async () => {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 32 * 5); // malform oldNullRoot
      await expect(
        rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys)),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_NULL_ROOT');
    });

    it('should reject for malformed root root', async () => {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      proofData.writeUInt32BE(randInt(), 32 * 7); // malform oldRootRoot
      await expect(
        rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys)),
      ).to.be.revertedWith('Rollup Processor: INCORRECT_ROOT_ROOT');
    });
  });

  describe('Transactions with fee', () => {
    it('should process a tx with fee and signature', async () => {
      const provider = userA.provider!;
      const txFee = 10n;
      const publicInput = depositAmount + txFee;
      const feeLimit = BigInt(10) ** BigInt(18);
      const prepaidFee = feeLimit;

      {
        // User deposits funds
        expect(await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString())).to.equal(0);
        expect(await provider.getBalance(rollupProcessor.address)).to.equal(0);

        await rollupProcessor.depositPendingFunds(ethAssetId, publicInput, userAAddress.toString(), {
          value: publicInput,
        });

        expect(await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString())).to.equal(publicInput);
        expect(await provider.getBalance(rollupProcessor.address)).to.equal(publicInput);
      }

      {
        // Rollup provider tops up tx fee
        expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(0);
        await feeDistributor.deposit(ethAssetId, prepaidFee, { value: prepaidFee });
        expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(prepaidFee);
      }

      const { proofData, signatures, providerSignature } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId, txFee),
        { feeLimit, feeDistributorAddress },
      );

      const providerInitialBalance = BigInt((await provider.getBalance(rollupProviderAddress.toString())).toString());

      const tx = await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        Buffer.concat(viewingKeys),
        providerSignature,
        rollupProviderAddress.toString(),
        rollupProviderAddress.toString(),
        feeLimit,
      );
      const receipt = await rollupProvider.provider!.getTransactionReceipt(tx.hash);
      const gasCost = BigInt(receipt.gasUsed.mul(tx.gasPrice).toString());
      const feeRefund = prepaidFee + txFee - BigInt(await feeDistributor.txFeeBalance(ethAssetId));

      expect(await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString())).to.equal(0);
      expect(await provider.getBalance(rollupProcessor.address)).to.equal(depositAmount);
      expect(await provider.getBalance(rollupProviderAddress.toString())).to.equal(
        providerInitialBalance + feeRefund - gasCost,
      );
    });

    it('should allow anyone to top up the fee distributor contract', async () => {
      const provider = userA.provider!;
      const txFee = 0n;
      const publicInput = depositAmount + txFee;
      const feeLimit = BigInt(10) ** BigInt(18);
      const prepaidFee = feeLimit;

      {
        // Deposit tx fee to distributor contract from userB
        expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(0);
        expect(await provider.getBalance(feeDistributor.address)).to.equal(0);
        const feeDistributorUserB = feeDistributor.connect(userB);
        await feeDistributorUserB.deposit(ethAssetId, prepaidFee, { value: prepaidFee });
        expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(prepaidFee);
        expect(await provider.getBalance(feeDistributor.address)).to.equal(prepaidFee);
      }

      await rollupProcessor.depositPendingFunds(ethAssetId, publicInput, userAAddress.toString(), {
        value: publicInput,
      });
      expect(await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString())).to.equal(publicInput);

      const { proofData, signatures, providerSignature } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId, txFee),
        { feeLimit, feeDistributorAddress },
      );

      const providerInitialBalance = BigInt((await provider.getBalance(rollupProviderAddress.toString())).toString());

      const tx = await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        Buffer.concat(viewingKeys),
        providerSignature,
        rollupProviderAddress.toString(),
        rollupProviderAddress.toString(),
        feeLimit,
      );
      const receipt = await rollupProvider.provider!.getTransactionReceipt(tx.hash);
      const gasCost = BigInt(receipt.gasUsed.mul(tx.gasPrice).toString());
      const feeRefund = prepaidFee + txFee - BigInt(await feeDistributor.txFeeBalance(ethAssetId));

      expect(await rollupProcessor.getUserPendingDeposit(ethAssetId, userAAddress.toString())).to.equal(0);
      expect(await provider.getBalance(rollupProcessor.address)).to.equal(depositAmount);
      expect(await provider.getBalance(rollupProviderAddress.toString())).to.equal(
        providerInitialBalance + feeRefund - gasCost,
      );
    });

    it('should reject a tx if the distributor contract is different than expected', async () => {
      const txFee = 10n;
      const publicInput = depositAmount + txFee;
      const feeLimit = BigInt(10) ** BigInt(18);
      const prepaidFee = feeLimit;
      const anotherFeeDistributor = EthAddress.randomAddress();

      await rollupProcessor.depositPendingFunds(ethAssetId, publicInput, userAAddress.toString(), {
        value: publicInput,
      });

      await feeDistributor.deposit(ethAssetId, prepaidFee, { value: prepaidFee });

      const { proofData, signatures, providerSignature } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId, txFee),
        {
          feeLimit,
          feeDistributorAddress: anotherFeeDistributor,
        },
      );

      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          Buffer.concat(viewingKeys),
          providerSignature,
          rollupProviderAddress.toString(),
          rollupProviderAddress.toString(),
          feeLimit,
        ),
      ).to.be.revertedWith('validateSignature: INVALID_SIGNATURE');
    });

    it('should reject a tx if it causes more than the fee limit', async () => {
      const txFee = 10n;
      const publicInput = depositAmount + txFee;
      const feeLimit = BigInt(10);
      const prepaidFee = BigInt(10) ** BigInt(18);

      await rollupProcessor.depositPendingFunds(ethAssetId, publicInput, userAAddress.toString(), {
        value: publicInput,
      });

      await feeDistributor.deposit(ethAssetId, prepaidFee, { value: prepaidFee });

      const { proofData, signatures, providerSignature } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId, txFee),
        {
          feeLimit,
          feeDistributorAddress,
        },
      );

      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          Buffer.concat(viewingKeys),
          providerSignature,
          rollupProviderAddress.toString(),
          rollupProviderAddress.toString(),
          feeLimit,
        ),
      ).to.be.revertedWith('Rollup Processor: REIMBURSE_GAS_FAILED');
    });

    it('should reject a tx that spends more than the remaining tx fee balance', async () => {
      const txFee = 10n;
      const publicInput = depositAmount + txFee;
      const feeLimit = BigInt(10) ** BigInt(18);
      const prepaidFee = BigInt(10);

      await rollupProcessor.depositPendingFunds(ethAssetId, publicInput, userAAddress.toString(), {
        value: publicInput,
      });

      await feeDistributor.deposit(ethAssetId, prepaidFee, { value: prepaidFee });

      const { proofData, signatures, providerSignature } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, ethAssetId, txFee),
        {
          feeLimit,
          feeDistributorAddress,
        },
      );

      await expect(
        rollupProcessor.processRollup(
          proofData,
          solidityFormatSignatures(signatures),
          Buffer.concat(viewingKeys),
          providerSignature,
          rollupProviderAddress.toString(),
          rollupProviderAddress.toString(),
          feeLimit,
        ),
      ).to.be.revertedWith('Rollup Processor: REIMBURSE_GAS_FAILED');
    });

    it('should be able to pay fee with erc20 tokens', async () => {
      const assetId = erc20AssetId;
      const txFee = 10n;
      const publicInput = depositAmount + txFee;
      const feeLimit = BigInt(10) ** BigInt(18);
      const prepaidFee = feeLimit;

      await erc20.approve(rollupProcessor.address, publicInput);
      await rollupProcessor.depositPendingFunds(assetId, publicInput, userAAddress.toString());

      expect(await rollupProcessor.getUserPendingDeposit(assetId, userAAddress.toString())).to.equal(publicInput);
      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(0);
      expect(await feeDistributor.txFeeBalance(assetId)).to.equal(0);
      expect(await erc20.balanceOf(feeDistributor.address)).to.equal(0);
      expect(await erc20.balanceOf(rollupProcessor.address)).to.equal(publicInput);

      await feeDistributor.deposit(ethAssetId, prepaidFee, { value: prepaidFee });
      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(prepaidFee);

      const { proofData, signatures, providerSignature } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA, assetId, txFee),
        {
          feeLimit,
          feeDistributorAddress,
        },
      );

      await rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        Buffer.concat(viewingKeys),
        providerSignature,
        rollupProviderAddress.toString(),
        rollupProviderAddress.toString(),
        feeLimit,
      );

      expect(await rollupProcessor.getUserPendingDeposit(assetId, userAAddress.toString())).to.equal(0);
      expect((await feeDistributor.txFeeBalance(ethAssetId)) < prepaidFee).to.equal(true);
      expect(await feeDistributor.txFeeBalance(assetId)).to.equal(txFee);
      expect(await erc20.balanceOf(feeDistributor.address)).to.equal(txFee);
      expect(await erc20.balanceOf(rollupProcessor.address)).to.equal(depositAmount);
    });
  });
});

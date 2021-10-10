import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset } from '@aztec/barretenberg/blockchain';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { FeeDistributor } from '../fee_distributor';
import { createDepositProof, createRollupProof, createSendProof } from './fixtures/create_mock_proof';
import { setupTestRollupProcessor } from './fixtures/setup_test_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: deposit', () => {
  let rollupProcessor: RollupProcessor;
  let feeDistributor: FeeDistributor;
  let assets: Asset[];
  let rollupProvider: Signer;
  let rollupProviderAddress: EthAddress;
  let feeDistributorAddress: EthAddress;
  let userSigners: Signer[];
  let userAddresses: EthAddress[];
  const depositAmount = 60n;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider, ...userSigners] = signers;
    rollupProviderAddress = EthAddress.fromString(await rollupProvider.getAddress());
    userAddresses = await Promise.all(userSigners.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ assets, rollupProcessor, feeDistributor, feeDistributorAddress } = await setupTestRollupProcessor(signers));
  });

  it('should process a tx with fee', async () => {
    const txFee = 10n;
    const publicInput = depositAmount + txFee;
    const prepaidFee = 10n ** 18n;

    // User deposits funds.
    await rollupProcessor.depositPendingFunds(AssetId.ETH, publicInput, undefined, undefined, {
      signingAddress: userAddresses[0],
    });

    // Rollup provider tops up fee distributor.
    await feeDistributor.deposit(EthAddress.ZERO, prepaidFee);

    const { proofData, signatures, providerSignature } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], AssetId.ETH, txFee),
      { feeDistributorAddress },
    );

    const providerInitialBalance = await assets[0].balanceOf(rollupProviderAddress);

    const tx = await rollupProcessor.createRollupProofTx(
      proofData,
      signatures,
      [],
      providerSignature,
      rollupProviderAddress,
      rollupProviderAddress,
    );
    const txHash = await rollupProcessor.sendTx(tx);

    const { gasPrice } = await ethers.provider.getTransaction(txHash.toString());
    const { gasUsed } = await ethers.provider.getTransactionReceipt(txHash.toString());
    const gasCost = BigInt(gasUsed.mul(gasPrice).toString());
    const feeDistributorBalance = await feeDistributor.txFeeBalance(EthAddress.ZERO);
    const feeRefund = prepaidFee + txFee - feeDistributorBalance;

    expect(await rollupProcessor.getUserPendingDeposit(AssetId.ETH, userAddresses[0])).toBe(0n);
    expect(await assets[0].balanceOf(rollupProcessor.address)).toBe(depositAmount);
    expect(await assets[0].balanceOf(rollupProviderAddress)).toBe(providerInitialBalance + feeRefund - gasCost);
  });

  it('should reject a tx if the distributor contract is different than expected', async () => {
    const { proofData, signatures, providerSignature } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], AssetId.ETH),
      {
        feeDistributorAddress: EthAddress.randomAddress(),
      },
    );

    const tx = await rollupProcessor.createRollupProofTx(
      proofData,
      signatures,
      [],
      providerSignature,
      rollupProviderAddress,
      rollupProviderAddress,
    );

    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('validateSignature: INVALID_SIGNATURE');
  });

  it('should reject a tx if it causes more than the fee limit', async () => {
    const feeLimit = 10n;

    await feeDistributor.deposit(EthAddress.ZERO, 10n ** 18n);

    const { proofData, signatures, providerSignature } = await createRollupProof(rollupProvider, createSendProof(), {
      feeLimit,
      feeDistributorAddress,
    });

    const tx = await rollupProcessor.createRollupProofTx(
      proofData,
      signatures,
      [],
      providerSignature,
      rollupProviderAddress,
      rollupProviderAddress,
      feeLimit,
    );

    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: REIMBURSE_GAS_FAILED');
  });

  it('should reject a tx that spends more than the remaining fee distributor balance', async () => {
    const { proofData, signatures, providerSignature } = await createRollupProof(rollupProvider, createSendProof(), {
      feeDistributorAddress,
    });

    const tx = await rollupProcessor.createRollupProofTx(
      proofData,
      signatures,
      [],
      providerSignature,
      rollupProviderAddress,
      rollupProviderAddress,
    );

    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: REIMBURSE_GAS_FAILED');
  });

  it('should be able to pay fee with erc20 tokens', async () => {
    const asset = assets[AssetId.DAI];
    const txFee = 10n;
    const publicInput = depositAmount + txFee;
    const prepaidFee = 10n ** 18n;

    await asset.approve(publicInput, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(AssetId.DAI, publicInput, undefined, undefined, {
      signingAddress: userAddresses[0],
    });
    await feeDistributor.deposit(EthAddress.ZERO, prepaidFee);

    const { proofData, signatures, providerSignature } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], AssetId.DAI, txFee),
      { feeDistributorAddress },
    );

    const tx = await rollupProcessor.createRollupProofTx(
      proofData,
      signatures,
      [],
      providerSignature,
      rollupProviderAddress,
      rollupProviderAddress,
    );
    await rollupProcessor.sendTx(tx);

    expect((await feeDistributor.txFeeBalance(EthAddress.ZERO)) < prepaidFee).toBe(true);
    expect(await feeDistributor.txFeeBalance(asset.getStaticInfo().address)).toBe(txFee);
    expect(await asset.balanceOf(feeDistributor.address)).toBe(txFee);
    expect(await asset.balanceOf(rollupProcessor.address)).toBe(depositAmount);
  });
});

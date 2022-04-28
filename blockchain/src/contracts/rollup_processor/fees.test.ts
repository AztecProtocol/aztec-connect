import { EthAddress } from '@aztec/barretenberg/address';
import { Asset } from '@aztec/barretenberg/blockchain';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { FeeDistributor } from '../fee_distributor';
import { createDepositProof, createRollupProof } from './fixtures/create_mock_proof';
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

    // User deposits funds.
    await rollupProcessor.depositPendingFunds(0, publicInput, undefined, {
      signingAddress: userAddresses[0],
    });

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], 0, txFee),
      { feeDistributorAddress },
    );

    const providerInitialBalance = await assets[0].balanceOf(rollupProviderAddress);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    const txHash = await rollupProcessor.sendTx(tx);

    const { gasPrice } = await ethers.provider.getTransaction(txHash.toString());
    const { gasUsed } = await ethers.provider.getTransactionReceipt(txHash.toString());
    const gasCost = BigInt(gasUsed.mul(gasPrice!).toString());
    const feeDistributorETHBalance = await feeDistributor.txFeeBalance(EthAddress.ZERO);

    expect(feeDistributorETHBalance).toBe(txFee);
    expect(await rollupProcessor.getUserPendingDeposit(0, userAddresses[0])).toBe(0n);
    expect(await assets[0].balanceOf(rollupProcessor.address)).toBe(depositAmount);
    expect(await assets[0].balanceOf(rollupProviderAddress)).toBe(providerInitialBalance - gasCost);
  });

  it('should be able to pay fee with erc20 tokens', async () => {
    const asset = assets[1];
    const txFee = 10n;
    const publicInput = depositAmount + txFee;
    const prepaidFee = 10n ** 18n;

    await asset.approve(publicInput, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, publicInput, undefined, {
      signingAddress: userAddresses[0],
    });
    await feeDistributor.deposit(EthAddress.ZERO, prepaidFee);

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], 1, txFee),
      { feeDistributorAddress },
    );

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    expect(await feeDistributor.txFeeBalance(EthAddress.ZERO)).toBe(prepaidFee);
    expect(await feeDistributor.txFeeBalance(asset.getStaticInfo().address)).toBe(txFee);
    expect(await asset.balanceOf(feeDistributor.address)).toBe(txFee);
    expect(await asset.balanceOf(rollupProcessor.address)).toBe(depositAmount);
  });
});

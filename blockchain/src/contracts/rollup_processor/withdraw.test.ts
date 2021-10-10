import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset } from '@aztec/barretenberg/blockchain';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { EthersAdapter } from '../../provider';
import { TokenAsset } from '../asset';
import {
  createDepositProof,
  createRollupProof,
  createWithdrawProof,
  mergeInnerProofs,
} from './fixtures/create_mock_proof';
import { setupTestRollupProcessor } from './fixtures/setup_test_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: withdraw', () => {
  let rollupProcessor: RollupProcessor;
  let assets: Asset[];
  let rollupProvider: Signer;
  let userSigners: Signer[];
  let userAddresses: EthAddress[];
  const depositAmount = 60n;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider, ...userSigners] = signers;
    userAddresses = await Promise.all(userSigners.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ assets, rollupProcessor } = await setupTestRollupProcessor(signers));

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      mergeInnerProofs([
        await createDepositProof(depositAmount, userAddresses[0], userSigners[0], AssetId.ETH),
        await createDepositProof(depositAmount, userAddresses[1], userSigners[1], AssetId.DAI),
      ]),
    );

    await assets[1].approve(depositAmount, userAddresses[1], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(AssetId.ETH, depositAmount, undefined, undefined, {
      signingAddress: userAddresses[0],
    });
    await rollupProcessor.depositPendingFunds(AssetId.DAI, depositAmount, undefined, undefined, {
      signingAddress: userAddresses[1],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);
  });

  it('should withdraw eth', async () => {
    const preWithdrawlBalance = await assets[0].balanceOf(userAddresses[0]);
    const withdrawalAmount = 20n;

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      createWithdrawProof(withdrawalAmount, userAddresses[0], AssetId.ETH),
      { rollupId: 1 },
    );

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    const postWithdrawalRollupBalance = await assets[0].balanceOf(rollupProcessor.address);
    expect(postWithdrawalRollupBalance).toBe(depositAmount - withdrawalAmount);

    const postWithdrawalBalance = await assets[0].balanceOf(userAddresses[0]);
    expect(postWithdrawalBalance).toBe(preWithdrawlBalance + withdrawalAmount);
  });

  it('should withdraw erc20', async () => {
    const preWithdrawlBalance = await assets[1].balanceOf(userAddresses[0]);
    const withdrawalAmount = 20n;

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      createWithdrawProof(withdrawalAmount, userAddresses[2], AssetId.DAI),
      { rollupId: 1 },
    );

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    const postWithdrawalRollupBalance = await assets[1].balanceOf(rollupProcessor.address);
    expect(postWithdrawalRollupBalance).toBe(depositAmount - withdrawalAmount);

    const postWithdrawalBalance = await assets[1].balanceOf(userAddresses[2]);
    expect(postWithdrawalBalance).toBe(preWithdrawlBalance + withdrawalAmount);
  });

  it('should revert if withdraw fails due to faulty ERC20 transfer', async () => {
    const FaultyERC20 = await ethers.getContractFactory('ERC20FaultyTransfer');
    const faultyERC20 = await FaultyERC20.deploy();
    const assetAddr = EthAddress.fromString(faultyERC20.address);
    const asset = await TokenAsset.fromAddress(assetAddr, new EthersAdapter(ethers.provider), false);

    await rollupProcessor.setSupportedAsset(asset.address, false);
    const assetId = (await rollupProcessor.getSupportedAssets()).findIndex(a => a.equals(assetAddr));

    // Deposit.
    {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAddresses[0], userSigners[0], assetId),
        { rollupId: 1 },
      );

      await asset.mint(depositAmount, userAddresses[0]);
      await asset.approve(depositAmount, userAddresses[0], rollupProcessor.address);

      await rollupProcessor.depositPendingFunds(assetId, depositAmount, undefined, undefined, {
        signingAddress: userAddresses[0],
      });
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
      await rollupProcessor.sendTx(tx);
    }

    const { proofData } = await createRollupProof(
      rollupProvider,
      createWithdrawProof(depositAmount, userAddresses[0], assetId),
      { rollupId: 2 },
    );
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('ERC20FaultyTransfer: FAILED');
  });
});

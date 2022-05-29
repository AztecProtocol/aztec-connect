import { EthAddress } from '@aztec/barretenberg/address';
import { Asset } from '@aztec/barretenberg/blockchain';
import { virtualAssetIdFlag } from '@aztec/barretenberg/bridge_id';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { evmSnapshot, evmRevert } from '../../ganache/hardhat_chain_manipulation';
import { EthersAdapter } from '../../provider';
import { TokenAsset } from '../asset';
import {
  createDepositProof,
  createRollupProof,
  createWithdrawProof,
  mergeInnerProofs,
} from './fixtures/create_mock_proof';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: withdraw', () => {
  let rollupProcessor: RollupProcessor;
  let assets: Asset[];
  let rollupProvider: Signer;
  let userSigners: Signer[];
  let userAddresses: EthAddress[];
  const depositAmount = 60n;

  let snapshot: string;

  beforeAll(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider, ...userSigners] = signers;
    userAddresses = await Promise.all(userSigners.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ assets, rollupProcessor } = await setupTestRollupProcessor(signers));

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      mergeInnerProofs([
        await createDepositProof(depositAmount, userAddresses[0], userSigners[0], 0),
        await createDepositProof(depositAmount, userAddresses[1], userSigners[1], 1),
      ]),
    );

    await assets[1].approve(depositAmount, userAddresses[1], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(0, depositAmount, undefined, {
      signingAddress: userAddresses[0],
    });
    await rollupProcessor.depositPendingFunds(1, depositAmount, undefined, {
      signingAddress: userAddresses[1],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('should withdraw eth', async () => {
    const preWithdrawalBalance = await assets[0].balanceOf(userAddresses[0]);
    const withdrawalAmount = 20n;

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      createWithdrawProof(withdrawalAmount, userAddresses[0], 0),
      { rollupId: 1 },
    );

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    const postWithdrawalRollupBalance = await assets[0].balanceOf(rollupProcessor.address);
    expect(postWithdrawalRollupBalance).toBe(depositAmount - withdrawalAmount);

    const postWithdrawalBalance = await assets[0].balanceOf(userAddresses[0]);
    expect(postWithdrawalBalance).toBe(preWithdrawalBalance + withdrawalAmount);
  });

  it('should withdraw erc20', async () => {
    const preWithdrawalBalance = await assets[1].balanceOf(userAddresses[0]);
    const withdrawalAmount = 20n;

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      createWithdrawProof(withdrawalAmount, userAddresses[2], 1),
      { rollupId: 1 },
    );

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    const postWithdrawalRollupBalance = await assets[1].balanceOf(rollupProcessor.address);
    expect(postWithdrawalRollupBalance).toBe(depositAmount - withdrawalAmount);

    const postWithdrawalBalance = await assets[1].balanceOf(userAddresses[2]);
    expect(postWithdrawalBalance).toBe(preWithdrawalBalance + withdrawalAmount);
  });

  it('should NOT revert if withdraw fails due to faulty ERC20 transfer', async () => {
    const FaultyERC20 = await ethers.getContractFactory('ERC20FaultyTransfer');
    const faultyERC20 = await FaultyERC20.deploy();
    const assetAddr = EthAddress.fromString(faultyERC20.address);
    const gasLimit = 55000;
    const asset = await TokenAsset.fromAddress(assetAddr, new EthersAdapter(ethers.provider), gasLimit);

    await rollupProcessor.setSupportedAsset(asset.address, gasLimit);
    const assetId = (await rollupProcessor.getSupportedAssets()).length;

    // Deposit.
    {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAddresses[0], userSigners[0], assetId),
        { rollupId: 1 },
      );

      await asset.mint(depositAmount, userAddresses[0]);
      await asset.approve(depositAmount, userAddresses[0], rollupProcessor.address);

      await rollupProcessor.depositPendingFunds(assetId, depositAmount, undefined, {
        signingAddress: userAddresses[0],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
      await rollupProcessor.sendTx(tx);
    }

    const preWithdrawalBalance = await asset.balanceOf(userAddresses[0]);
    const { proofData } = await createRollupProof(
      rollupProvider,
      createWithdrawProof(depositAmount, userAddresses[0], assetId),
      { rollupId: 2 },
    );
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);
    const postWithdrawalBalance = await asset.balanceOf(userAddresses[0]);
    expect(postWithdrawalBalance).toBe(preWithdrawalBalance);
  });

  it('should revert if withdraw of virtual asset', async () => {
    const FaultyERC20 = await ethers.getContractFactory('ERC20FaultyTransfer');
    const faultyERC20 = await FaultyERC20.deploy();
    const assetAddr = EthAddress.fromString(faultyERC20.address);
    const gasLimit = 55000;
    const asset = await TokenAsset.fromAddress(assetAddr, new EthersAdapter(ethers.provider), gasLimit);

    await rollupProcessor.setSupportedAsset(asset.address, gasLimit);
    const assetId = (await rollupProcessor.getSupportedAssets()).length;
    const virtualAssetId = assetId + virtualAssetIdFlag;

    // Deposit.
    {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAddresses[0], userSigners[0], assetId),
        { rollupId: 1 },
      );

      await asset.mint(depositAmount, userAddresses[0]);
      await asset.approve(depositAmount, userAddresses[0], rollupProcessor.address);

      await rollupProcessor.depositPendingFunds(assetId, depositAmount, undefined, {
        signingAddress: userAddresses[0],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
      await rollupProcessor.sendTx(tx);
    }

    const preWithdrawalBalance = await asset.balanceOf(userAddresses[0]);
    const { proofData } = await createRollupProof(
      rollupProvider,
      createWithdrawProof(depositAmount, userAddresses[0], virtualAssetId),
      { rollupId: 2 },
    );
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('INVALID_ASSET_ID()');
    const postWithdrawalBalance = await asset.balanceOf(userAddresses[0]);
    expect(postWithdrawalBalance).toBe(preWithdrawalBalance);
  });
});

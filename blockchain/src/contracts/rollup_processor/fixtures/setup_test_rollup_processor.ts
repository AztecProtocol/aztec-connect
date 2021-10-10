import { EthAddress } from '@aztec/barretenberg/address';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { TestRollupProcessor } from './test_rollup_processor';
import { EthersAdapter } from '../../../provider';
import { setupAssets } from '../../asset/fixtures/setup_assets';
import { setupFeeDistributor } from '../../fee_distributor/fixtures/setup_fee_distributor';
import { setupUniswap } from '../../fee_distributor/fixtures/setup_uniswap';

export async function setupTestRollupProcessor(
  signers: Signer[],
  { numberOfTokenAssets = 2, escapeBlockLowerBound = 0, escapeBlockUpperBound = 1 } = {},
) {
  const rollupProvider = signers[0];
  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();

  const DefiBridgeProxy = await ethers.getContractFactory('DefiBridgeProxy');
  const defiBridgeProxy = await DefiBridgeProxy.deploy();

  const ownerAddress = rollupProvider.getAddress();

  const RollupProcessorContract = await ethers.getContractFactory('TestRollupProcessor', rollupProvider);
  const rollupProcessorContract = await RollupProcessorContract.deploy(
    mockVerifier.address,
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    defiBridgeProxy.address,
    ownerAddress,
  );

  const rollupProcessor = new TestRollupProcessor(
    EthAddress.fromString(rollupProcessorContract.address),
    new EthersAdapter(ethers.provider),
  );

  const assets = await setupAssets(rollupProvider, signers, 10n ** 18n, numberOfTokenAssets);

  const { uniswapRouter, createPair } = await setupUniswap(rollupProvider);
  const { feeDistributor } = await setupFeeDistributor(
    rollupProvider,
    rollupProcessor.address,
    EthAddress.fromString(uniswapRouter.address),
  );
  await rollupProcessor.setFeeDistributor(feeDistributor.address);

  const initialTotalSupply = 10n * 10n ** 18n;
  const tokenAssets = assets.slice(1);
  await Promise.all(tokenAssets.map(a => rollupProcessor.setSupportedAsset(a.getStaticInfo().address, true)));
  await Promise.all(tokenAssets.map(a => createPair(a, initialTotalSupply)));

  const assetAddresses = assets.map(a => a.getStaticInfo().address);

  return {
    rollupProcessor,
    rollupProcessorAddress: rollupProcessor.address,
    feeDistributor,
    feeDistributorAddress: feeDistributor.address,
    assets,
    assetAddresses,
  };
}

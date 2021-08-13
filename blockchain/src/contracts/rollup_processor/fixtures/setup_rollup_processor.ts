import { EthAddress } from '@aztec/barretenberg/address';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { RollupProcessor } from '..';
import { advanceBlocks, blocksToAdvance } from './advance_block';
import { setupAssets } from '../../asset/fixtures/setup_assets';
import { setupDefiBridges } from './setup_defi_bridges';
import { setupFeeDistributor } from '../../fee_distributor/fixtures/setup_fee_distributor';
import { setupUniswap } from '../../fee_distributor/fixtures/setup_uniswap';
import { EthersAdapter } from '../../../provider';

export async function setupRollupProcessor(signers: Signer[], numberOfTokenAssets: number) {
  const rollupProvider = signers[0];
  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();

  const DefiBridgeProxy = await ethers.getContractFactory('DefiBridgeProxy');
  const defiBridgeProxy = await DefiBridgeProxy.deploy();

  const ownerAddress = rollupProvider.getAddress();

  const RollupProcessorContract = await ethers.getContractFactory('RollupProcessor', rollupProvider);
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;
  const rollupProcessorContract = await RollupProcessorContract.deploy(
    mockVerifier.address,
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    defiBridgeProxy.address,
    ownerAddress,
  );

  const rollupProcessor = new RollupProcessor(
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

  const { uniswapBridgeIds, uniswapBridgeAddrs } = await setupDefiBridges(
    rollupProvider,
    rollupProcessorContract,
    uniswapRouter,
    assets,
  );
  const assetAddresses = assets.map(a => a.getStaticInfo().address);

  // Advance into block region where escapeHatch is active.
  const blocks = await blocksToAdvance(80, 100, ethers.provider);
  await advanceBlocks(blocks, ethers.provider);

  return {
    rollupProcessor,
    rollupProcessorAddress: rollupProcessor.address,
    feeDistributor,
    feeDistributorAddress: feeDistributor.address,
    uniswapRouter,
    uniswapBridgeIds,
    uniswapBridgeAddrs,
    assets,
    assetAddresses,
  };
}

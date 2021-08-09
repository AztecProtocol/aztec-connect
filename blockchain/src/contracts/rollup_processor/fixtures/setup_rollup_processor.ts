import { EthAddress } from '@aztec/barretenberg/address';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { RollupProcessor } from '..';
import { advanceBlocks, blocksToAdvance } from './advance_block';
import { createWeth, setupAssets } from '../../asset/fixtures/setup_assets';
import { setupDefiBridges } from './setup_defi_bridges';
import { setupFeeDistributor } from '../../fee_distributor/fixtures/setup_fee_distributor';
import { setupUniswap } from '../../fee_distributor/fixtures/setup_uniswap';
import { EthersAdapter } from '../../../provider';

export async function setupRollupProcessor(signers: Signer[], numberOfTokenAssets: number) {
  const rollupProvider = signers[0];
  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();

  const weth = await createWeth(rollupProvider);
  const DefiBridgeProxy = await ethers.getContractFactory('DefiBridgeProxy');
  const defiBridgeProxy = await DefiBridgeProxy.deploy(weth.address);

  const ownerAddress = rollupProvider.getAddress();

  const RollupProcessorContract = await ethers.getContractFactory('RollupProcessor', rollupProvider);
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;
  const rollupProcessorContract = await RollupProcessorContract.deploy(
    mockVerifier.address,
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    defiBridgeProxy.address,
    weth.address,
    ownerAddress,
  );

  const rollupProcessor = new RollupProcessor(
    EthAddress.fromString(rollupProcessorContract.address),
    new EthersAdapter(ethers.provider),
  );

  const { uniswapRouter, createPair } = await setupUniswap(rollupProvider, weth);
  const { feeDistributor } = await setupFeeDistributor(
    rollupProvider,
    rollupProcessor.address,
    EthAddress.fromString(uniswapRouter.address),
  );
  await rollupProcessor.setFeeDistributor(feeDistributor.address);

  const initialUserTokenBalance = 10n ** 18n;
  const initialTotalSupply = 10n * 10n ** 18n;
  const assets = await setupAssets(rollupProvider, signers, initialUserTokenBalance, numberOfTokenAssets);
  const tokenAssets = assets.slice(1);
  await Promise.all(tokenAssets.map(a => rollupProcessor.setSupportedAsset(a.getStaticInfo().address, true)));
  await Promise.all(tokenAssets.map(a => createPair(a, initialTotalSupply)));

  const { uniswapBridgeIds, uniswapBridgeAddrs } = await setupDefiBridges(
    rollupProvider,
    rollupProcessorContract,
    uniswapRouter,
    assets,
  );
  const assetAddresses = [EthAddress.fromString(weth.address), ...tokenAssets.map(a => a.getStaticInfo().address)];

  // Advance into block region where escapeHatch is active.
  const blocks = await blocksToAdvance(80, 100, ethers.provider);
  await advanceBlocks(blocks, ethers.provider);

  return {
    rollupProcessor,
    rollupProcessorAddress: rollupProcessor.address,
    feeDistributor,
    feeDistributorAddress: feeDistributor.address,
    weth,
    uniswapRouter,
    uniswapBridgeIds,
    uniswapBridgeAddrs,
    assets,
    assetAddresses,
  };
}

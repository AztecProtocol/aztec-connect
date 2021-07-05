import { EthAddress } from '@aztec/barretenberg/address';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { advanceBlocks, blocksToAdvance } from './advance_block';
import { createWeth, TokenAsset } from './assets';
import { setupDefiBridges } from './setup_defi_bridges';
import { setupFeeDistributor } from './setup_fee_distributor';
import { setupUniswap } from './setup_uniswap';

export async function setupRollupProcessor(
  rollupProvider: Signer,
  users: Signer[],
  mintAmount: bigint | number,
  numberOfTokenAssets = 1,
) {
  const weth = await createWeth(rollupProvider);

  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();

  const DefiBridgeProxy = await ethers.getContractFactory('DefiBridgeProxy');
  const defiBridgeProxy = await DefiBridgeProxy.deploy(weth.address);

  const ownerAddress = rollupProvider.getAddress();

  const RollupProcessor = await ethers.getContractFactory('RollupProcessor', rollupProvider);
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;
  const rollupProcessor = await RollupProcessor.deploy(
    mockVerifier.address,
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    defiBridgeProxy.address,
    weth.address,
    ownerAddress,
  );

  const { router, createPair } = await setupUniswap(rollupProvider, weth);
  const { feeDistributor } = await setupFeeDistributor(rollupProvider, rollupProcessor, router);

  const ethAssetId = 0;
  const erc20AssetId = 1;
  const tokenAssets: TokenAsset[] = [];
  const ERC20 = await ethers.getContractFactory('ERC20Mintable', rollupProvider);
  for (let i = 0; i < numberOfTokenAssets; ++i) {
    const contract = await ERC20.deploy();

    // mint tokens for testing
    for (const user of users) {
      const userAddress = await user.getAddress();
      await contract.mint(userAddress, mintAmount);
    }

    await rollupProcessor.setSupportedAsset(contract.address, false);

    const tokenAsset = { id: i + 1, contract };
    tokenAssets.push(tokenAsset);
    await createPair(tokenAsset);
  }

  const { uniswapBridges } = await setupDefiBridges(rollupProvider, rollupProcessor, router, tokenAssets);

  // advance into block region where escapeHatch is active
  const blocks = await blocksToAdvance(80, 100, ethers.provider);
  await advanceBlocks(blocks, ethers.provider);

  const viewingKeys = [Buffer.alloc(ViewingKey.SIZE, 1), Buffer.alloc(ViewingKey.SIZE, 2)];
  const rollupSize = 2;

  const assetAddresses = [EthAddress.fromString(weth.address)];
  tokenAssets.forEach(({ id, contract }) => {
    assetAddresses[id] = EthAddress.fromString(contract.address);
  });

  return {
    rollupProcessor,
    feeDistributor,
    tokenAssets,
    assetAddresses,
    weth,
    router,
    uniswapBridges,
    erc20: tokenAssets[0].contract.connect(users[0]),
    viewingKeys,
    rollupSize,
    ethAssetId,
    erc20AssetId,
  };
}

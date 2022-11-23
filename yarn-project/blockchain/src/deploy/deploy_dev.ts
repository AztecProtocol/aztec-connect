import { EthAddress } from '@aztec/barretenberg/address';
import { TreeInitData } from '@aztec/barretenberg/environment';
import { Signer } from 'ethers';
import {
  deployUniswapPair,
  deployDefiBridgeProxy,
  deployDummyBridge,
  deployFeeDistributor,
  deployMockPriceFeed,
  deployRollupProcessor,
  deployUniswap,
  deployUniswapBridge,
  deployVerifier,
  deployErc20,
  deployAztecFaucet,
  deployMockDataProvider,
} from './deployers/index.js';

const escapeBlockLower = 2160;
const escapeBlockUpper = 2400;

export async function deployDev(
  signer: Signer,
  { dataTreeSize, roots }: TreeInitData,
  vk: string,
  faucetOperator?: EthAddress,
  rollupProvider?: EthAddress,
) {
  const uniswapRouter = await deployUniswap(signer);
  const verifier = await deployVerifier(signer, vk);
  const defiProxy = await deployDefiBridgeProxy(signer);
  const { rollup, permitHelper } = await deployRollupProcessor(
    signer,
    verifier,
    defiProxy,
    await signer.getAddress(),
    escapeBlockLower,
    escapeBlockUpper,
    roots.dataRoot,
    roots.nullRoot,
    roots.rootsRoot,
    dataTreeSize,
    true,
    true,
  );
  await rollup.setCapped(false);

  const feeDistributor = await deployFeeDistributor(signer, rollup, uniswapRouter.address);

  await rollup.setRollupProvider(rollupProvider ? rollupProvider.toString() : await signer.getAddress(), true);
  await rollup.grantRole(await rollup.LISTER_ROLE(), await signer.getAddress());

  const asset0 = await deployErc20(rollup, permitHelper, signer, true, 'DAI');
  const asset1 = await deployErc20(rollup, permitHelper, signer, true, 'BTC', 8);

  const gasPrice = BigInt(20) * BigInt(10) ** BigInt(9); // 20 gwei
  const daiPrice = BigInt(1) * BigInt(10) ** BigInt(15); // 1000 DAI/ETH
  const initialEthSupply = BigInt(1) * BigInt(10) ** BigInt(17); // 0.1 ETH
  const initialTokenSupply = (initialEthSupply * BigInt(10) ** BigInt(18)) / daiPrice;

  const bridgeDataProvider = await deployMockDataProvider(signer);

  // in order to maintain the same sequence on bridge address ids, we need to deploy some dummy bridges into slots 1-4
  for (let i = 0; i < 4; i++) {
    const dummyBridge = await deployDummyBridge(rollup, signer, [asset0, asset1]);
    await bridgeDataProvider.setBridgeData(i + 1, dummyBridge.address, 50000, 'Dummy Bridge');
  }

  await deployUniswapPair(signer, uniswapRouter, asset0, initialTokenSupply, initialEthSupply);
  const uniswapBridge = await deployUniswapBridge(signer, rollup, uniswapRouter);
  const dummyBridge = await deployDummyBridge(rollup, signer, [asset0, asset1]);

  await bridgeDataProvider.setBridgeData(5, uniswapBridge.address, 50000, 'Uniswap Bridge');
  await bridgeDataProvider.setBridgeData(6, dummyBridge.address, 50000, 'Dummy Bridge');

  const gasPriceFeedContact = await deployMockPriceFeed(signer, gasPrice);
  const daiPriceFeedContact = await deployMockPriceFeed(signer, daiPrice);
  const priceFeeds = [gasPriceFeedContact.address, daiPriceFeedContact.address];

  const faucet = await deployAztecFaucet(signer, faucetOperator);

  return { rollup, priceFeeds, feeDistributor, permitHelper, faucet, bridgeDataProvider };
}

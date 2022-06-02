import { TreeInitData } from '@aztec/barretenberg/environment';
import { Signer } from 'ethers';
import {
  deployUniswapPair,
  deployDefiBridgeProxy,
  deployDummyBridge,
  deployFeeDistributor,
  deployMockPriceFeed,
  deployMockVerifier,
  deployRollupProcessor,
  deployUniswap,
  deployUniswapBridge,
  deployVerifier,
} from './deployers';
import { deployErc20 } from './deployers/deploy_erc20';

const escapeBlockLower = 2160;
const escapeBlockUpper = 2400;

export async function deployDev(signer: Signer, { dataTreeSize, roots }: TreeInitData, vk?: string) {
  const uniswapRouter = await deployUniswap(signer);
  const verifier = vk ? await deployVerifier(signer, vk) : await deployMockVerifier(signer);
  const defiProxy = await deployDefiBridgeProxy(signer);
  const { rollup } = await deployRollupProcessor(
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
  );
  const feeDistributor = await deployFeeDistributor(signer, rollup, uniswapRouter.address);

  await rollup.setRollupProvider(await signer.getAddress(), true);

  const asset0 = await deployErc20(rollup, signer, true, 'DAI');
  const asset1 = await deployErc20(rollup, signer, true, 'BTC', 8);

  const gasPrice = 20n * 10n ** 9n; // 20 gwei
  const daiPrice = 1n * 10n ** 15n; // 1000 DAI/ETH
  const initialEthSupply = 1n * 10n ** 17n; // 0.1 ETH
  const initialTokenSupply = (initialEthSupply * 10n ** 18n) / daiPrice;
  await deployUniswapPair(signer, uniswapRouter, asset0, initialTokenSupply, initialEthSupply);
  await deployUniswapBridge(signer, rollup, uniswapRouter);
  await deployDummyBridge(rollup, signer, [asset0, asset1]);

  const gasPriceFeedContact = await deployMockPriceFeed(signer, gasPrice);
  const daiPriceFeedContact = await deployMockPriceFeed(signer, daiPrice);
  const priceFeeds = [gasPriceFeedContact.address, daiPriceFeedContact.address];

  return { rollup, priceFeeds, feeDistributor };
}

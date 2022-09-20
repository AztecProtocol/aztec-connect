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
  deployCompoundBridge,
  deployAztecFaucet,
} from './deployers';
import { deployErc20 } from './deployers/deploy_erc20';

const escapeBlockLower = 2160;
const escapeBlockUpper = 2400;

export async function deployDev(signer: Signer, { dataTreeSize, roots }: TreeInitData, vk: string) {
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
  const feeDistributor = await deployFeeDistributor(signer, rollup, uniswapRouter.address);

  await rollup.setRollupProvider(await signer.getAddress(), true);
  await rollup.grantRole(await rollup.LISTER_ROLE(), await signer.getAddress());

  const asset0 = await deployErc20(rollup, permitHelper, signer, true, 'DAI');
  const asset1 = await deployErc20(rollup, permitHelper, signer, true, 'BTC', 8);

  const gasPrice = 20n * 10n ** 9n; // 20 gwei
  const daiPrice = 1n * 10n ** 15n; // 1000 DAI/ETH
  const initialEthSupply = 1n * 10n ** 17n; // 0.1 ETH
  const initialTokenSupply = (initialEthSupply * 10n ** 18n) / daiPrice;
  await deployUniswapPair(signer, uniswapRouter, asset0, initialTokenSupply, initialEthSupply);
  await deployUniswapBridge(signer, rollup, uniswapRouter);
  await deployDummyBridge(rollup, signer, [asset0, asset1]);
  await deployCompoundBridge(signer, rollup);

  const gasPriceFeedContact = await deployMockPriceFeed(signer, gasPrice);
  const daiPriceFeedContact = await deployMockPriceFeed(signer, daiPrice);
  const priceFeeds = [gasPriceFeedContact.address, daiPriceFeedContact.address];

  const faucet = await deployAztecFaucet(signer);

  return { rollup, priceFeeds, feeDistributor, permitHelper, faucet };
}

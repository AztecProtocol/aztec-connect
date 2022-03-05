import { InitHelpers } from '@aztec/barretenberg/environment';
import { Contract, ContractFactory, Signer } from 'ethers';
import { EthAddress } from '@aztec/barretenberg/address';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { addAsset } from './add_asset/add_asset';
import { deployDefiBridgeProxy } from './deploy_defi_bridge_proxy';
import { deployFeeDistributor } from './deploy_fee_distributor';
import { deployPriceFeed } from './deploy_price_feed';
import { createUniswapPair, deployUniswap, deployUniswapBridge } from './deploy_uniswap';
import { deployMockVerifier, deployVerifier } from './deploy_verifier';
import { deployElementBridge, elementAssets, elementConfig, setupElementPools } from './deploy_element';

async function deployRollupProcessor(
  signer: Signer,
  verifier: Contract,
  defiProxy: Contract,
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  initDataRoot: Buffer,
  initNullRoot: Buffer,
  initRootsRoot: Buffer,
  initDataSize: number,
) {
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
  const rollup = await rollupFactory.deploy();

  await rollup.initialize(
    verifier.address,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    defiProxy.address,
    await signer.getAddress(),
    initDataRoot,
    initNullRoot,
    initRootsRoot,
    initDataSize,
  );

  console.error(`RollupProcessor contract address: ${rollup.address}`);

  return rollup;
}

async function deployErc20Contracts(signer: Signer, rollup: Contract) {
  const asset0 = await addAsset(rollup, signer, false, 'DAI');
  const asset1 = await addAsset(rollup, signer, false, 'BTC', 8);
  return [asset0, asset1];
}

async function deployBridgeContracts(signer: Signer, rollup: Contract, uniswapRouter: Contract) {
  const uniswapBridge = await deployUniswapBridge(signer, rollup, uniswapRouter);
  await rollup.setSupportedBridge(uniswapBridge.address, 0n);

  if ((await signer.provider!.getCode(elementConfig.balancerAddress)) != '0x') {
    console.error(`Balancer contract not found, element bridge and it's assets won't be deployed.`);
    return;
  }

  for (const elementAsset of elementAssets) {
    await rollup.setSupportedAsset(elementAsset.inputAsset, false, 0);
  }

  const elementBridge = await deployElementBridge(
    signer,
    rollup.address,
    elementConfig.trancheFactoryAddress,
    elementConfig.trancheByteCodeHash,
    elementConfig.balancerAddress,
  );
  await rollup.setSupportedBridge(elementBridge.address, 1000000n);

  await setupElementPools(elementConfig, elementBridge);
}

export async function deploy(
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  signer: Signer,
  initialEthSupply = 1n * 10n ** 17n, // 0.1 ETH
  vk?: string,
) {
  const signerAddress = await signer.getAddress();
  console.error(`Signer: ${signerAddress}`);

  const chainId = await signer.getChainId();
  console.error(`Chain id: ${chainId}`);

  const { initDataRoot, initNullRoot, initRootsRoot } = InitHelpers.getInitRoots(chainId);
  const initDataSize: number = InitHelpers.getInitDataSize(chainId);
  console.error(`Initial data size: ${initDataSize}`);
  console.error(`Initial data root: ${initDataRoot.toString('hex')}`);
  console.error(`Initial null root: ${initNullRoot.toString('hex')}`);
  console.error(`Initial root root: ${initRootsRoot.toString('hex')}`);

  const uniswapRouter = await deployUniswap(signer);

  const verifier = vk ? await deployVerifier(signer, vk) : await deployMockVerifier(signer);

  const defiProxy = await deployDefiBridgeProxy(signer);

  const rollup = await deployRollupProcessor(
    signer,
    verifier,
    defiProxy,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    initDataRoot,
    initNullRoot,
    initRootsRoot,
    initDataSize,
  );

  const feeDistributor = await deployFeeDistributor(signer, rollup, uniswapRouter);

  const [erc20Asset] = await deployErc20Contracts(signer, rollup);
  await uniswapRouter.deployed();
  await erc20Asset.deployed();

  const gasPrice = 20n * 10n ** 9n; // 20 gwei
  const daiPrice = 1n * 10n ** 15n; // 1000 DAI/ETH
  const btcPrice = 2n * 10n ** 2n; // 0.05 ETH/BTC
  const initialTokenSupply = (initialEthSupply * 10n ** 18n) / daiPrice;
  await createUniswapPair(signer, uniswapRouter, erc20Asset, initialTokenSupply, initialEthSupply);

  const priceFeeds = [
    await deployPriceFeed(signer, gasPrice),
    await deployPriceFeed(signer, daiPrice),
    await deployPriceFeed(signer, btcPrice),
  ];

  await deployBridgeContracts(signer, rollup, uniswapRouter);

  const feePayingAssets = [EthAddress.ZERO.toString(), erc20Asset.address];

  return { rollup, priceFeeds, feeDistributor, feePayingAssets };
}

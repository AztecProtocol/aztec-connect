#!/usr/bin/env node
import { InitHelpers } from '@aztec/barretenberg/environment';
import { parseEther } from '@ethersproject/units';
import { ContractFactory, Signer } from 'ethers';
import { EthAddress } from '@aztec/barretenberg/address';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { addAsset } from './add_asset/add_asset';
import { deployDefiBridge } from './deploy_defi_bridge';
import { deployDefiBridgeProxy } from './deploy_defi_bridge_proxy';
import { deployFeeDistributor } from './deploy_fee_distributor';
import { deployPriceFeed } from './deploy_price_feed';
import { createPair, deployUniswap } from './deploy_uniswap';
import { deployMockVerifier, deployVerifier } from './deploy_verifier';

// initialEthSupply = 0.1 ETH
export async function deploy(
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  signer: Signer,
  initialEthSupply = 1n * 10n ** 17n,
  vk?: string,
) {
  const uniswapRouter = await deployUniswap(signer);
  await uniswapRouter.deployed();

  const verifier = vk ? await deployVerifier(signer, vk) : await deployMockVerifier(signer);
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);

  const defiProxy = await deployDefiBridgeProxy(signer);

  const chainId = await signer.getChainId();
  console.error(`Chain ID: ${chainId}`);

  const { initDataRoot, initNullRoot, initRootsRoot } = InitHelpers.getInitRoots(chainId);
  const initDataSize: number = InitHelpers.getInitDataSize(chainId);
  console.error(`Initial data size: ${initDataSize}`);
  console.error(`Initial data root: ${initDataRoot.toString('hex')}`);
  console.error(`Initial null root: ${initNullRoot.toString('hex')}`);
  console.error(`Initial root root: ${initRootsRoot.toString('hex')}`);

  // note we need to change this address for production to the multisig
  const ownerAddress = await signer.getAddress();

  console.error(`Awaiting deployment...`);

  const rollup = await rollupFactory.deploy();

  await rollup.deployed();

  await rollup.initialize(
    verifier.address,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    defiProxy.address,
    ownerAddress,
    initDataRoot,
    initNullRoot,
    initRootsRoot,
    initDataSize,
  );

  console.error(`Rollup contract address: ${rollup.address}`);

  const feeDistributor = await deployFeeDistributor(signer, rollup, uniswapRouter);

  const initialFee = '0.1';
  console.error(`Depositing ${initialFee} ETH to FeeDistributor.`);
  const amount = parseEther(initialFee);
  await feeDistributor.deposit(EthAddress.ZERO.toString(), amount, { value: amount });

  const permitSupport = false;
  const asset = await addAsset(rollup, signer, permitSupport);
  await addAsset(rollup, signer, permitSupport, 8);

  const gasPrice = 20n * 10n ** 9n; // 20 gwei
  const assetPrice = 1n * 10n ** 15n; // 1000 DAI/ETH
  const btcPrice = 2n * 10n ** 2n; // 0.05 ETH/BTC
  const initialTokenSupply = (initialEthSupply * 10n ** 18n) / assetPrice;
  await createPair(signer, uniswapRouter, asset, initialTokenSupply, initialEthSupply);

  const priceFeeds = [
    await deployPriceFeed(signer, gasPrice),
    await deployPriceFeed(signer, assetPrice),
    await deployPriceFeed(signer, btcPrice),
  ];

  // Defi bridge
  const defiBridges = [
    await deployDefiBridge(signer, rollup, uniswapRouter, EthAddress.ZERO.toString(), asset.address),
    await deployDefiBridge(signer, rollup, uniswapRouter, asset.address, EthAddress.ZERO.toString()),
  ];

  return { rollup, feeDistributor, uniswapRouter, priceFeeds, defiBridges };
}

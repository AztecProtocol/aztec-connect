#!/usr/bin/env node
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
import { deployVerifier } from './deploy_standard_verifier';

export async function deploy(escapeHatchBlockLower: number, escapeHatchBlockUpper: number, signer: Signer) {
  const uniswapRouter = await deployUniswap(signer);
  await uniswapRouter.deployed();

  const verifier = await deployVerifier(signer);
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);

  const defiProxy = await deployDefiBridgeProxy(signer);

  // note we need to change this address for production to the multisig
  const ownerAddress = await signer.getAddress();
  const rollup = await rollupFactory.deploy(
    verifier.address,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    defiProxy.address,
    ownerAddress,
  );

  console.error(`Awaiting deployment...`);
  await rollup.deployed();
  console.error(`Rollup contract address: ${rollup.address}`);

  const feeDistributor = await deployFeeDistributor(signer, rollup, uniswapRouter);
  rollup.setFeeDistributor(feeDistributor.address);

  const initialFee = '1';
  console.error(`Depositing ${initialFee} ETH to FeeDistributor.`);
  const amount = parseEther(initialFee);
  await feeDistributor.deposit(EthAddress.ZERO.toString(), amount, { value: amount });

  const permitSupport = false;
  const asset1 = await addAsset(rollup, signer, permitSupport);
  const decimals2 = 8;
  const asset2 = await addAsset(rollup, signer, permitSupport, decimals2);

  const gasPrice = 200000000000n; // 50 gwei
  const assetPrice1 = 500000000000000n; // 2000 DAI/ETH
  const assetPrice2 = 15n * 10n ** 18n; // 15 ETH/BTC
  {
    const initialEthSupply = 10n * 10n ** 18n;
    // 20000 DAI - 10 ETH
    await createPair(signer, uniswapRouter, asset1, (initialEthSupply * 10n ** 18n) / assetPrice1, initialEthSupply);
  }
  {
    const initialEthSupply = 150n * 10n ** 18n;
    // 10 BTC - 150 ETH
    await createPair(
      signer,
      uniswapRouter,
      asset2,
      (initialEthSupply * 10n ** BigInt(decimals2)) / assetPrice2,
      initialEthSupply,
    );
  }

  const priceFeeds = [
    await deployPriceFeed(signer, gasPrice),
    await deployPriceFeed(signer, assetPrice1),
    await deployPriceFeed(signer, assetPrice2),
  ];

  // Defi bridge
  const defiBridges = [
    await deployDefiBridge(signer, rollup, uniswapRouter, EthAddress.ZERO.toString(), asset1.address),
    await deployDefiBridge(signer, rollup, uniswapRouter, EthAddress.ZERO.toString(), asset2.address),
    await deployDefiBridge(signer, rollup, uniswapRouter, asset1.address, EthAddress.ZERO.toString()),
    await deployDefiBridge(signer, rollup, uniswapRouter, asset2.address, EthAddress.ZERO.toString()),
  ];

  return { rollup, feeDistributor, uniswapRouter, priceFeeds, defiBridges };
}

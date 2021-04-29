#!/usr/bin/env node
import { Contract, ContractFactory, Signer } from 'ethers';
import { parseEther } from '@ethersproject/units';
import UniswapV2Router02Json from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import FeeDistributor from '../artifacts/contracts/interfaces/IFeeDistributor.sol/IFeeDistributor.json';
import { deployFeeDistributor } from './deploy_fee_distributor';
import { deployVerifier } from './deploy_verifier';
import { addAsset } from './add_asset/add_asset';
import { createPair, deployUniswap } from './deploy_uniswap';
import { deployPriceFeed } from './deploy_price_feed';

export async function deploy(
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  signer: Signer,
  initialFee?: string,
  feeDistributorAddress?: string,
  uniswapRouterAddress?: string,
  initialTokenSupply?: bigint,
  initialEthSupply?: bigint,
) {
  const verifier = await deployVerifier(signer);
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);

  // note we need to change this address for production to the multisig
  const ownerAddress = await signer.getAddress();
  const rollup = await rollupFactory.deploy(
    verifier.address,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    ownerAddress,
  );

  console.error(`Awaiting deployment...`);
  await rollup.deployed();
  console.error(`Rollup contract address: ${rollup.address}`);

  const uniswapRouter = uniswapRouterAddress
    ? new Contract(uniswapRouterAddress, UniswapV2Router02Json.abi, signer)
    : await deployUniswap(signer);
  await uniswapRouter.deployed();

  const feeDistributor = feeDistributorAddress
    ? new Contract(feeDistributorAddress, FeeDistributor.abi, signer)
    : await deployFeeDistributor(signer, rollup, uniswapRouter);
  rollup.setFeeDistributor(feeDistributor.address);

  if (initialFee) {
    console.error(`Depositing ${initialFee} ETH to FeeDistributor.`);
    const amount = parseEther(initialFee);
    await feeDistributor.deposit(0, amount, { value: amount });
  }

  const gasPriceFeed = await deployPriceFeed(signer, 100000000000n);

  // Add test asset without permit support.
  const asset = await addAsset(rollup, signer, false);
  await createPair(signer, uniswapRouter, asset, initialTokenSupply, initialEthSupply);
  const priceFeeds = [gasPriceFeed, await deployPriceFeed(signer)];

  return { rollup, feeDistributor, uniswapRouter, priceFeeds };
}

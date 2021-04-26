#!/usr/bin/env node
import { ethers, Signer } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { deploy } from './deploy';

const {
  ETHEREUM_HOST,
  INFURA_API_KEY,
  NETWORK,
  PRIVATE_KEY,
  ESCAPE_BLOCK_LOWER = '4560', // window of 1hr every 20hrs (escape in last 240 blocks of every 4800)
  ESCAPE_BLOCK_UPPER = '4800',
} = process.env;

function getSigner() {
  if (INFURA_API_KEY && NETWORK && PRIVATE_KEY) {
    console.error(`Infura network: ${NETWORK}`);
    const provider = new ethers.providers.InfuraProvider(NETWORK, INFURA_API_KEY);
    return new NonceManager(new ethers.Wallet(PRIVATE_KEY, provider) as Signer);
  } else if (ETHEREUM_HOST) {
    console.error(`Json rpc provider: ${ETHEREUM_HOST}`);
    const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
    return new NonceManager(provider.getSigner(0));
  }
}

async function main() {
  const [, , initialFee, feeDistributorAddress, uniswapRouterAddress] = process.argv;

  const signer = getSigner();
  if (!signer) {
    throw new Error('Failed to create signer. Set ETHEREUM_HOST or INFURA_API_KEY, NETWORK, PRIVATE_KEY.');
  }

  const { rollup, priceFeeds } = await deploy(
    +ESCAPE_BLOCK_LOWER,
    +ESCAPE_BLOCK_UPPER,
    signer,
    initialFee,
    feeDistributorAddress,
    uniswapRouterAddress,
  );

  console.log(`export ROLLUP_CONTRACT_ADDRESS=${rollup.address}`);
  console.log(`export PRICE_FEED_CONTRACT_ADDRESSES=${priceFeeds.map(p => p.address).join(',')}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

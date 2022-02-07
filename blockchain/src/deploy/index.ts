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
  INITIAL_ETH_SUPPLY = '100000000000000000', // 0.1 ETH
  VK,
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
  return undefined;
}

async function main() {
  const signer = getSigner();
  if (!signer) {
    throw new Error('Failed to create connection. Set ETHEREUM_HOST or INFURA_API_KEY, NETWORK, PRIVATE_KEY.');
  }

  const initialEthSupply = BigInt(INITIAL_ETH_SUPPLY);

  const { rollup, priceFeeds, feeDistributor } = await deploy(
    +ESCAPE_BLOCK_LOWER,
    +ESCAPE_BLOCK_UPPER,
    signer,
    initialEthSupply,
    VK,
  );

  const envVars = {
    ROLLUP_CONTRACT_ADDRESS: rollup.address,
    FEE_DISTRIBUTOR_ADDRESS: feeDistributor.address,
    PRICE_FEED_CONTRACT_ADDRESSES: priceFeeds.map(p => p.address).join(','),
  };

  for (const [k, v] of Object.entries(envVars)) {
    console.log(`export ${k}=${v}`);
    console.log(`export TF_VAR_${k}=${v}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

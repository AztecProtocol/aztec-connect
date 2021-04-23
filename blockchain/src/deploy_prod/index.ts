#!/usr/bin/env node
import { ethers, Signer } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { deploy } from './deploy';

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  PRIVATE_KEY,
  ESCAPE_BLOCK_LOWER = '4560', // window of 1hr every 20hrs (escape in last 240 blocks of every 4800)
  ESCAPE_BLOCK_UPPER = '4800',
} = process.env;

const MULTI_SIG_ADDRESS = '0xE298a76986336686CC3566469e3520d23D1a8aaD';

// https://uniswap.org/docs/v2/smart-contracts/router02/#address
const UNISWAP_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

function getSigner() {
  if (!PRIVATE_KEY) {
    throw new Error('Specify PRIVATE_KEY.');
  }
  console.error(`Json rpc provider: ${ETHEREUM_HOST}`);
  const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
  return new NonceManager(new ethers.Wallet(PRIVATE_KEY, provider) as Signer);
}

async function main() {
  const { rollup, feeDistributor } = await deploy(
    +ESCAPE_BLOCK_LOWER,
    +ESCAPE_BLOCK_UPPER,
    UNISWAP_ROUTER_ADDRESS,
    MULTI_SIG_ADDRESS,
    getSigner(),
  );
  console.log(`ROLLUP_CONTRACT_ADDRESS: ${rollup.address}`);
  console.log(`FEE_DISTRIBUTOR_ADDRESS: ${feeDistributor.address}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node
import { ethers, Signer } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { deployFeeDistributor } from './deploy_fee_distributor';

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  PRIVATE_KEY,
  ROLLUP_CONTRACT_ADDRESS,
  UNISWAP_ROUTER_ADDRESS,
} = process.env;

function getSigner() {
  if (!PRIVATE_KEY) {
    throw new Error('Specify PRIVATE_KEY.');
  }
  console.error(`Json rpc provider: ${ETHEREUM_HOST}`);
  const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
  return new NonceManager(new ethers.Wallet(PRIVATE_KEY, provider) as Signer);
}

async function main() {
  if (!ROLLUP_CONTRACT_ADDRESS) {
    throw new Error('Specify ROLLUP_CONTRACT_ADDRESS.');
  }
  if (!UNISWAP_ROUTER_ADDRESS) {
    throw new Error('Specify UNISWAP_ROUTER_ADDRESS.');
  }
  const feeDistributor = await deployFeeDistributor(getSigner(), ROLLUP_CONTRACT_ADDRESS, UNISWAP_ROUTER_ADDRESS);
  console.log(`FEE_DISTRIBUTOR_ADDRESS: ${feeDistributor.address}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

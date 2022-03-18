#!/usr/bin/env node
import { ethers, Signer } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { deployDefiBridgeProxy } from './deploy_defi_bridge_proxy';

const { ETHEREUM_HOST = 'http://localhost:8545', PRIVATE_KEY, WETH_ADDRESS } = process.env;

function getSigner() {
  if (!PRIVATE_KEY) {
    throw new Error('Specify PRIVATE_KEY.');
  }
  console.error(`Json rpc provider: ${ETHEREUM_HOST}`);
  const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
  return new NonceManager(new ethers.Wallet(PRIVATE_KEY, provider) as Signer);
}

async function main() {
  if (!WETH_ADDRESS) {
    throw new Error('Specify WETH_ADDRESS.');
  }

  const defiBridgeProxy = await deployDefiBridgeProxy(getSigner(), WETH_ADDRESS);
  console.log(`DEFI_BRIDGE_PROXY_ADDRESS=${defiBridgeProxy.address}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

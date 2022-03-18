#!/usr/bin/env node
import { ethers, Signer } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { deployVerifier } from './deploy_verifier';

const { ETHEREUM_HOST = 'http://localhost:8545', PRIVATE_KEY, VK = 'VerificationKey28x32' } = process.env;

function getSigner() {
  if (!PRIVATE_KEY) {
    throw new Error('Specify PRIVATE_KEY.');
  }
  console.error(`Json rpc provider: ${ETHEREUM_HOST}`);
  const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
  return new NonceManager(new ethers.Wallet(PRIVATE_KEY, provider) as Signer);
}

async function main() {
  const verifier = await deployVerifier(getSigner(), VK);
  console.log(`VERIFIER_ADDRESS: ${verifier.address}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

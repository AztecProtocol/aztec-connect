#!/usr/bin/env node
import { Contract, ethers, Signer } from 'ethers';
import RollupProcessor from '../../artifacts/RollupProcessor.json';
import { addAsset } from './add_asset';

const { ETHEREUM_HOST, INFURA_API_KEY, NETWORK, PRIVATE_KEY, ROLLUP_CONTRACT_ADDRESS } = process.env;

function getSigner() {
  if (INFURA_API_KEY && NETWORK && PRIVATE_KEY) {
    console.error(`Infura network: ${NETWORK}`);
    const provider = new ethers.providers.InfuraProvider(NETWORK, INFURA_API_KEY);
    return new ethers.Wallet(PRIVATE_KEY, provider) as Signer;
  } else if (ETHEREUM_HOST) {
    console.error(`Json rpc provider: ${ETHEREUM_HOST}`);
    const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
    return provider.getSigner(0);
  }
}
async function main() {
  const [, , erc20Address, supportsPermitStr] = process.argv;
  const supportsPermit = !!supportsPermitStr;

  const signer = getSigner();
  if (!signer) {
    throw new Error('Failed to create signer. Set ETHEREUM_HOST or INFURA_API_KEY, NETWORK, PRIVATE_KEY.');
  }

  if (!ROLLUP_CONTRACT_ADDRESS) {
    throw new Error('Pass a ROLLUP_CONTRACT_ADDRESS.');
  }

  const rollup = new Contract(ROLLUP_CONTRACT_ADDRESS, RollupProcessor.abi, signer);
  erc20Address ? erc20Address : await addAsset(rollup, signer, supportsPermit);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

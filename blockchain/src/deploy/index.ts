#!/usr/bin/env node
import { ContractFactory, ethers, Signer } from 'ethers';
import ERC20Mintable from '../artifacts/ERC20Mintable.json';
import RollupProcessor from '../artifacts/RollupProcessor.json';

const { ETHEREUM_HOST, INFURA_API_KEY, NETWORK, PRIVATE_KEY } = process.env;

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

const scalingFactor = 1;

async function main() {
  const signer = getSigner();
  const erc20Factory = new ContractFactory(ERC20Mintable.abi, ERC20Mintable.bytecode, signer);
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
  const erc20 = await erc20Factory.deploy();
  const rollup = await rollupFactory.deploy(erc20.address, scalingFactor);

  console.log(`export ERC20_CONTRACT_ADDRESS=${erc20.address}`);
  console.log(`export ROLLUP_CONTRACT_ADDRESS=${rollup.address}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

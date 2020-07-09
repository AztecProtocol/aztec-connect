#!/usr/bin/env node
import dotenv from 'dotenv';
import { ContractFactory, ethers, Signer } from 'ethers';
import ERC20Mintable from '../artifacts/ERC20Mintable.json';
import RollupProcessor from '../artifacts/RollupProcessor.json';

dotenv.config();
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
  const [, , env = 'dev', mint, approve] = process.argv;

  const signer = getSigner();
  if (!signer) {
    throw new Error('Failed to create signer. Set ETHEREUM_HOST or INFURA_API_KEY, NETWORK, PRIVATE_KEY.');
  }

  if (env === 'dev') {
    const erc20Factory = new ContractFactory(ERC20Mintable.abi, ERC20Mintable.bytecode, signer);
    const erc20 = await erc20Factory.deploy();
    const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
    const rollup = await rollupFactory.deploy(erc20.address, scalingFactor);

    if (mint) {
      await erc20.mint(signer.getAddress(), mint);
    }
    if (approve) {
      await erc20.approve(rollup.address, approve);
    }

    console.log(`export ERC20_CONTRACT_ADDRESS=${erc20.address}`);
    console.log(`export ROLLUP_CONTRACT_ADDRESS=${rollup.address}`);
  } else {
    const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
    const rollup = await rollupFactory.deploy(env, scalingFactor);
    console.log(`export ERC20_CONTRACT_ADDRESS=${env}`);
    console.log(`export ROLLUP_CONTRACT_ADDRESS=${rollup.address}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

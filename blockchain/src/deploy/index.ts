#!/usr/bin/env node
import { ContractFactory, ethers, Signer } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import ERC20Mintable from '../artifacts/ERC20Mintable.json';
import RollupProcessor from '../artifacts/RollupProcessor.json';
import { deployVerifier } from './deploy_verifier';

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
  const [, , erc20Address] = process.argv;

  const signer = getSigner();
  if (!signer) {
    throw new Error('Failed to create signer. Set ETHEREUM_HOST or INFURA_API_KEY, NETWORK, PRIVATE_KEY.');
  }

  if (!erc20Address) {
    console.error('Deploying ERC20...');
    const erc20Factory = new ContractFactory(ERC20Mintable.abi, ERC20Mintable.bytecode, signer);
    const erc20 = await erc20Factory.deploy();

    const verifier = await deployVerifier(signer);

    console.error('Deploying RollupProcessor...');
    const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
    const rollup = await rollupFactory.deploy(
      [erc20.address],
      verifier.address,
      ESCAPE_BLOCK_LOWER,
      ESCAPE_BLOCK_UPPER,
    );

    console.error(`Awaiting deployment...`);
    await rollup.deployed();

    console.error(`ERC20 contract address: ${erc20.address}`);
    console.error(`Rollup contract address: ${rollup.address}`);
    console.log(`export ERC20_CONTRACT_ADDRESS=${erc20.address}`);
    console.log(`export ROLLUP_CONTRACT_ADDRESS=${rollup.address}`);
  } else {
    const verifier = await deployVerifier(signer);
    const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
    console.log({ erc20Address, verifier: verifier.address, ESCAPE_BLOCK_LOWER, ESCAPE_BLOCK_UPPER });
    const rollup = await rollupFactory.deploy([erc20Address], verifier.address, ESCAPE_BLOCK_LOWER, ESCAPE_BLOCK_UPPER);

    console.error(`Awaiting deployment...`);
    await rollup.deployed();

    console.error(`Rollup contract address: ${rollup.address}`);
    console.log(`export ERC20_CONTRACT_ADDRESS=${erc20Address}`);
    console.log(`export ROLLUP_CONTRACT_ADDRESS=${rollup.address}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

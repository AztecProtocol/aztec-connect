#!/usr/bin/env node
import { Contract, ContractFactory, ethers, Signer } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { parseEther } from '@ethersproject/units';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import FeeDistributor from '../artifacts/contracts/interfaces/IFeeDistributor.sol/IFeeDistributor.json';
import { deployFeeDistributor } from './deploy_fee_distributor';
import { deployVerifier } from './deploy_verifier';
import { addAsset, setSupportedAsset } from './add_asset/add_asset';

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
  const [, , feeDistributorAddress, initialFee, erc20Address, supportsPermitStr] = process.argv;

  const signer = getSigner();
  if (!signer) {
    throw new Error('Failed to create signer. Set ETHEREUM_HOST or INFURA_API_KEY, NETWORK, PRIVATE_KEY.');
  }

  const verifier = await deployVerifier(signer);
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
  const rollup = await rollupFactory.deploy(verifier.address, ESCAPE_BLOCK_LOWER, ESCAPE_BLOCK_UPPER);

  console.error(`Awaiting deployment...`);
  await rollup.deployed();
  console.error(`Rollup contract address: ${rollup.address}`);

  const feeDistributor = feeDistributorAddress
    ? new Contract(feeDistributorAddress, FeeDistributor.abi, signer)
    : await deployFeeDistributor(signer, rollup);
  rollup.setFeeDistributor(feeDistributor.address);

  if (initialFee) {
    const amount = parseEther(initialFee);
    feeDistributor.deposit(0, amount, { value: amount });
  }

  if (!erc20Address) {
    // Add asset with permit support.
    await addAsset(rollup, signer, true);
  } else {
    await setSupportedAsset(rollup, erc20Address, !!supportsPermitStr);
  }

  console.log(`export ROLLUP_CONTRACT_ADDRESS=${rollup.address}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

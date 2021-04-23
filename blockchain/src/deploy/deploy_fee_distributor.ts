#!/usr/bin/env node
import { Contract, ContractFactory, Signer } from 'ethers';
import AztecFeeDistributor from '../artifacts/contracts/AztecFeeDistributor.sol/AztecFeeDistributor.json';

export async function deployFeeDistributor(signer: Signer, rollupProcessor: Contract, uniswapRouter: Contract) {
  console.error('Deploying FeeDistributor...');
  const feeDistributorLibrary = new ContractFactory(AztecFeeDistributor.abi, AztecFeeDistributor.bytecode, signer);
  const feeDistributor = await feeDistributorLibrary.deploy(rollupProcessor.address, uniswapRouter.address);
  console.error(`FeeDistributor contract address: ${feeDistributor.address}`);

  return feeDistributor;
}

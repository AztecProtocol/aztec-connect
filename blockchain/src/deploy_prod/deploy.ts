import { ContractFactory, Signer } from 'ethers';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { deployFeeDistributor } from './fee_distributor/deploy_fee_distributor';
import { deployVerifier } from './deploy_verifier';

export async function deploy(
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  multiSigAddr: string,
  signer: Signer,
) {
  const verifier = await deployVerifier(signer);
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);

  const ownerAddress = await signer.getAddress();
  const rollup = await rollupFactory.deploy(
    verifier.address,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    ownerAddress,
  );

  console.error(`Awaiting deployment...`);
  await rollup.deployed();
  console.error(`Rollup contract address: ${rollup.address}`);

  const feeDistributor = await deployFeeDistributor(signer, rollup.address);
  rollup.setFeeDistributor(feeDistributor.address);

  const response: TransactionResponse = await rollup.transferOwnership(multiSigAddr);
  const receipt = await response.wait();

  if (!receipt.status) {
    throw new Error('Deployment failed.');
  }

  return { rollup, feeDistributor };
}

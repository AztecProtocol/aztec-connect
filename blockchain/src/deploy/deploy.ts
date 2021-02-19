#!/usr/bin/env node
import { Contract, ContractFactory, Signer } from 'ethers';
import { parseEther } from '@ethersproject/units';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import FeeDistributor from '../artifacts/contracts/interfaces/IFeeDistributor.sol/IFeeDistributor.json';
import { deployFeeDistributor } from './deploy_fee_distributor';
import { deployVerifier } from './deploy_verifier';
import { addAsset } from './add_asset/add_asset';

export async function deploy(
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  signer: Signer,
  initialFee?: string,
  feeDistributorAddress?: string,
) {
  const verifier = await deployVerifier(signer);
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);

  // note we need to change this address for production to the multisig
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

  const feeDistributor = feeDistributorAddress
    ? new Contract(feeDistributorAddress, FeeDistributor.abi, signer)
    : await deployFeeDistributor(signer, rollup);
  rollup.setFeeDistributor(feeDistributor.address);

  if (initialFee) {
    console.error(`Depositing ${initialFee} ETH to FeeDistributor.`);
    const amount = parseEther(initialFee);
    await feeDistributor.deposit(0, amount, { value: amount });
  }

  // Add test asset with permit support.
  await addAsset(rollup, signer, true);

  return { rollup, feeDistributor };
}

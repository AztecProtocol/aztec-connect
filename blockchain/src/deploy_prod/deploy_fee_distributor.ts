import { ContractFactory, Signer } from 'ethers';
import AztecFeeDistributor from '../artifacts/contracts/AztecFeeDistributor.sol/AztecFeeDistributor.json';

export async function deployFeeDistributor(signer: Signer, rollupProcessorAddress: string) {
  console.error('Deploying FeeDistributor...');
  const feeDistributorLibrary = new ContractFactory(AztecFeeDistributor.abi, AztecFeeDistributor.bytecode, signer);
  const feeDistributor = await feeDistributorLibrary.deploy(rollupProcessorAddress);
  console.error(`FeeDistributor contract address: ${feeDistributor.address}`);

  return feeDistributor;
}

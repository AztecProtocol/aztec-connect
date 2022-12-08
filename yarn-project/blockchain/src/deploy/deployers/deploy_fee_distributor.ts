import { Contract, ContractFactory, Signer } from 'ethers';
import { AztecFeeDistributor } from '../../abis.js';

const gasLimit = 5000000;

export async function deployFeeDistributor(signer: Signer, rollupProcessor: Contract, uniswapRouterAddress: string) {
  console.log('Deploying FeeDistributor...');
  const feeDistributorLibrary = new ContractFactory(AztecFeeDistributor.abi, AztecFeeDistributor.bytecode, signer);
  const feeClaimer = await signer.getAddress();
  const feeDistributor = await feeDistributorLibrary.deploy(feeClaimer, rollupProcessor.address, uniswapRouterAddress, {
    gasLimit,
  });
  console.log(`FeeDistributor contract address: ${feeDistributor.address}`);

  return feeDistributor;
}

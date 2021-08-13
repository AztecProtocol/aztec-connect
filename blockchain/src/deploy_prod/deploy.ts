import { ContractFactory, Signer } from 'ethers';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { deployFeeDistributor } from './fee_distributor/deploy_fee_distributor';
import { deployVerifier } from './deploy_verifier';
import { deployDefiBridgeProxy } from '../deploy/deploy_defi_bridge_proxy';

export async function deploy(
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  uniswapRouterAddress: string,
  multiSigAddr: string,
  signer: Signer,
) {
  const verifier = await deployVerifier(signer);

  const defiBridgeProxy = await deployDefiBridgeProxy(signer);

  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
  const ownerAddress = await signer.getAddress();
  const rollup = await rollupFactory.deploy(
    verifier.address,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    defiBridgeProxy.address,
    ownerAddress,
  );

  console.error(`Awaiting deployment...`);
  await rollup.deployed();
  console.error(`Rollup contract address: ${rollup.address}`);

  const feeDistributor = await deployFeeDistributor(signer, rollup.address, uniswapRouterAddress);
  rollup.setFeeDistributor(feeDistributor.address);

  const response: TransactionResponse = await rollup.transferOwnership(multiSigAddr);
  const receipt = await response.wait();

  if (!receipt.status) {
    throw new Error('Deployment failed.');
  }

  return { rollup, feeDistributor };
}

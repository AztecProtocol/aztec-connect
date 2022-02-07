import '@openzeppelin/hardhat-upgrades';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { ContractFactory, Signer } from 'ethers';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { deployFeeDistributor } from './fee_distributor/deploy_fee_distributor';
import { deployVerifier } from './deploy_verifier';
import { deployDefiBridgeProxy } from '../deploy/deploy_defi_bridge_proxy';
import { upgrades } from 'hardhat';

export async function deploy(
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  uniswapRouterAddress: string,
  multiSigAddr: string,
  signer: Signer,
  vk: string,
) {
  const verifier = await deployVerifier(signer, vk);

  const defiBridgeProxy = await deployDefiBridgeProxy(signer);

  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
  const ownerAddress = await signer.getAddress();

  const chainId = await signer.getChainId();
  console.error(`Chain ID: ${chainId}`);
  const { initDataRoot, initNullRoot, initRootsRoot } = InitHelpers.getInitRoots(chainId);
  const initDataSize: number = InitHelpers.getInitDataSize(chainId);

  const rollup = await upgrades.deployProxy(rollupFactory,
    [
        verifier.address,
        escapeHatchBlockLower,
        escapeHatchBlockUpper,
        defiBridgeProxy.address,
        ownerAddress,
        initDataRoot,
        initNullRoot,
        initRootsRoot,
        initDataSize,
    ], { initializer: 'initialize' });

  console.error(`Awaiting deployment...`);
  await rollup.deployed();
  console.error(`Rollup contract address: ${rollup.address}`);

  const feeDistributor = await deployFeeDistributor(signer, rollup.address, uniswapRouterAddress);
  const response: TransactionResponse = await rollup.transferOwnership(multiSigAddr);
  const receipt = await response.wait();

  if (!receipt.status) {
    throw new Error('Deployment failed.');
  }

  return { rollup, feeDistributor };
}

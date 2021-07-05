import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { TokenAsset } from './assets';

export const createFeeClaimer = async (publisher: Signer, weth: Contract, assets: Contract[]) => {
  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();

  const DefiBridgeProxy = await ethers.getContractFactory('DefiBridgeProxy');
  const defiBridgeProxy = await DefiBridgeProxy.deploy(weth.address);

  const FeeClaimer = await ethers.getContractFactory('FeeClaimer', publisher);
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;
  const feeClaimer = await FeeClaimer.deploy(
    mockVerifier.address,
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    defiBridgeProxy.address,
    weth.address,
    await publisher.getAddress(),
  );

  const tokenAssets: TokenAsset[] = [];
  for (const contract of assets) {
    await feeClaimer.setSupportedAsset(contract.address, true);
    tokenAssets.push({ id: tokenAssets.length + 1, contract });
  }

  return { feeClaimer, tokenAssets };
};

export const setupFeeDistributor = async (publisher: Signer, rollupProcessor: Contract, uniswapRouter: Contract) => {
  const AztecFeeDistributor = await ethers.getContractFactory('AztecFeeDistributor', publisher);
  const feeDistributor = await AztecFeeDistributor.deploy(rollupProcessor.address, uniswapRouter.address);
  await rollupProcessor.setFeeDistributor(feeDistributor.address);

  return {
    feeDistributor,
  };
};

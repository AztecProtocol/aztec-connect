import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { setupUniswap } from './setup_uniswap';

export interface TokenAsset {
  id: number;
  contract: Contract;
}

export const createFeeClaimer = async (publisher: Signer, assets: Contract[]) => {
  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();

  const FeeClaimer = await ethers.getContractFactory('FeeClaimer', publisher);
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;
  const feeClaimer = await FeeClaimer.deploy(
    mockVerifier.address,
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    await publisher.getAddress(),
  );

  const tokenAssets: TokenAsset[] = [];
  for (const contract of assets) {
    await feeClaimer.setSupportedAsset(contract.address, true);
    tokenAssets.push({ id: tokenAssets.length + 1, contract });
  }

  return { feeClaimer, tokenAssets };
};

export const setupFeeDistributor = async (publisher: Signer, rollupProcessor: Contract) => {
  const { router, createPair } = await setupUniswap(publisher);

  const AztecFeeDistributor = await ethers.getContractFactory('AztecFeeDistributor');
  const feeDistributor = await AztecFeeDistributor.deploy(rollupProcessor.address, router.address);

  await rollupProcessor.setFeeDistributor(feeDistributor.address);

  return {
    feeDistributor,
    router,
    createPair,
  };
};

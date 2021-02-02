import { ViewingKey } from 'barretenberg/viewing_key';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { advanceBlocks, blocksToAdvance } from './advance_block';

export async function setupRollupProcessor(rollupProvider: Signer, users: Signer[], mintAmount: bigint | number) {
  const ERC20 = await ethers.getContractFactory('ERC20Mintable');
  const erc20 = await ERC20.deploy();

  // mint tokens for testing
  for (const user of users) {
    const userAddress = await user.getAddress();
    await erc20.mint(userAddress, mintAmount);
  }

  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();
  const ownerAddress = rollupProvider.getAddress();

  const RollupProcessor = await ethers.getContractFactory('RollupProcessor', rollupProvider);
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;
  const rollupProcessor = await RollupProcessor.deploy(
    mockVerifier.address,
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    ownerAddress,
  );

  const AztecFeeDistributor = await ethers.getContractFactory('AztecFeeDistributor');
  const feeDistributor = await AztecFeeDistributor.deploy(rollupProcessor.address);

  await rollupProcessor.setFeeDistributor(feeDistributor.address);

  const ethAssetId = 0;

  await rollupProcessor.setSupportedAsset(erc20.address, false);
  const erc20AssetId = 1;

  // advance into block region where escapeHatch is active
  const blocks = await blocksToAdvance(80, 100, ethers.provider);
  await advanceBlocks(blocks, ethers.provider);

  const viewingKeys = [Buffer.alloc(ViewingKey.SIZE, 1), Buffer.alloc(ViewingKey.SIZE, 2)];
  const rollupSize = 2;

  return {
    rollupProcessor,
    feeDistributor,
    erc20,
    viewingKeys,
    rollupSize,
    ethAssetId,
    erc20AssetId,
  };
}

import { VIEWING_KEY_SIZE } from 'barretenberg/rollup_proof';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { EthLinkedAddress } from '../../src/contracts';
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

  const RollupProcessor = await ethers.getContractFactory('RollupProcessor', rollupProvider);
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;
  const rollupProcessor = await RollupProcessor.deploy(
    mockVerifier.address,
    escapeBlockLowerBound,
    escapeBlockUpperBound,
  );

  await rollupProcessor.setSupportedAsset(EthLinkedAddress.toString(), false);
  const ethAssetId = 0;

  await rollupProcessor.setSupportedAsset(erc20.address, false);
  const erc20AssetId = 1;

  // advance into block region where escapeHatch is active
  const blocks = await blocksToAdvance(80, 100, ethers.provider);
  await advanceBlocks(blocks, ethers.provider);

  const viewingKeys = [Buffer.alloc(VIEWING_KEY_SIZE, 1), Buffer.alloc(VIEWING_KEY_SIZE, 2)];
  const rollupSize = 2;

  return {
    rollupProcessor,
    erc20,
    viewingKeys,
    rollupSize,
    ethAssetId,
    erc20AssetId,
  };
}

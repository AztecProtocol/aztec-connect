import { ethers } from '@nomiclabs/buidler';
import { VIEWING_KEY_SIZE } from 'barretenberg/rollup_proof';
import { Signer } from 'ethers';
import { advanceBlocks, blocksToAdvance } from './advance_block';

export async function setupRollupProcessor(users: Signer[], mintAmount: bigint | number) {
  const ERC20 = await ethers.getContractFactory('ERC20Mintable');
  const erc20 = await ERC20.deploy();

  // mint tokens for testing
  for (const user of users) {
    const userAddress = await user.getAddress();
    await erc20.mint(userAddress, mintAmount);
  }

  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();

  const RollupProcessor = await ethers.getContractFactory('RollupProcessor');
  const rollupProcessor = await RollupProcessor.deploy(erc20.address, mockVerifier.address);

  // advance into block region where escapeHatch not active
  const blocks = await blocksToAdvance(15, 100, ethers.provider);
  await advanceBlocks(blocks, ethers.provider);

  const viewingKeys = [Buffer.alloc(VIEWING_KEY_SIZE, 1), Buffer.alloc(VIEWING_KEY_SIZE, 2)];
  const rollupSize = 2;

  return {
    rollupProcessor,
    erc20,
    viewingKeys,
    rollupSize,
  };
}

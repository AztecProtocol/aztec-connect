import { HttpProvider } from 'web3x/providers';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function blocksToAdvance(target: number, accuracy: number, provider: HttpProvider) {
  const blockNumber = await provider.send('eth_blockNumber');
  const remainder = blockNumber % accuracy;
  if (remainder > target) {
    return accuracy - remainder + target;
  } else {
    return target - remainder;
  }
}

export async function advanceBlocks(blocks: number, provider: HttpProvider) {
  const blockArray = new Array(blocks).fill(1);
  await Promise.all(
    blockArray.map(async value => {
      await sleep(50);
      await provider.send('evm_mine', []);
    }),
  );
  return await provider.send('eth_blockNumber');
}

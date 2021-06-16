import { JsonRpcProvider } from '@ethersproject/providers';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function blocksToAdvance(target: number, accuracy: number, provider: JsonRpcProvider) {
  const blockNumber = await provider.getBlockNumber();
  const remainder = blockNumber % accuracy;
  if (remainder > target) {
    return accuracy - remainder + target;
  } else {
    return target - remainder;
  }
}

export async function advanceBlocks(blocks: number, provider: JsonRpcProvider) {
  const blockArray = new Array(blocks).fill(1);
  await Promise.all(
    blockArray.map(async () => {
      await sleep(50);
      await provider.send('evm_mine', []);
    }),
  );
  return await provider.getBlockNumber();
}

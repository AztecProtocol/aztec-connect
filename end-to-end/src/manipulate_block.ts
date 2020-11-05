import { EthereumProvider } from 'aztec2-sdk';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function blocksToAdvance(target: number, accuracy: number, provider: EthereumProvider) {
  const blockNumber = await provider.request({ method: 'eth_blockNumber' });
  const remainder = blockNumber % accuracy;
  if (remainder > target) {
    return accuracy - remainder + target;
  } else {
    return target - remainder;
  }
}

export async function advanceBlocks(blocks: number, provider: EthereumProvider) {
  const blockArray = new Array(blocks).fill(1);
  await Promise.all(
    blockArray.map(async () => {
      await sleep(50);
      await provider.request({ method: 'evm_mine' });
    }),
  );
  return await provider.request({ method: 'eth_blockNumber' });
}

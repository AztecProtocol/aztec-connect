import { EthereumProvider } from 'aztec2-sdk';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getCurrentblockNumber(provider: EthereumProvider) {
  return parseInt(await provider.request({ method: 'eth_blockNumber' }));
}

export async function blocksToAdvance(target: number, accuracy: number, provider: EthereumProvider) {
  const blockNumber = await getCurrentblockNumber(provider);
  const remainder = blockNumber % accuracy;
  if (remainder > target) {
    return accuracy - remainder + target;
  } else {
    return target - remainder;
  }
}

export async function advanceBlocks(blocks: number, provider: EthereumProvider) {
  for (let i = 0; i < blocks; ++i) {
    await provider.request({ method: 'evm_mine' });
  }
  await sleep(1200); // wait for ethereum_blockchain to update its status (it's polling and updating status every second)
  return getCurrentblockNumber(provider);
}

import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { sleep } from '@aztec/barretenberg/sleep';

export async function getCurrentBlockNumber(provider: EthereumProvider) {
  return parseInt(await provider.request({ method: 'eth_blockNumber', params: [] }));
}

export async function blocksToAdvance(target: number, accuracy: number, provider: EthereumProvider) {
  const blockNumber = await getCurrentBlockNumber(provider);
  const remainder = blockNumber % accuracy;
  if (remainder > target) {
    return accuracy - remainder + target;
  } else {
    return target - remainder;
  }
}

export async function advanceBlocks(blocks: number, provider: EthereumProvider) {
  for (let i = 0; i < blocks; ++i) {
    await provider.request({ method: 'evm_mine', params: [] });
  }
  await sleep(1200); // wait for ethereum_blockchain to update its status (it's polling and updating status every second)
  return getCurrentBlockNumber(provider);
}

export async function getCurrentBlockTime(provider: EthereumProvider) {
  const block = await provider.request({ method: 'eth_getBlockByNumber', params: ['latest'] });
  return Number(block.timestamp);
}

export async function setBlockchainTime(unixTimestamp: number, provider: EthereumProvider) {
  const millisecondTimestamp = unixTimestamp * 1000;
  await provider.request({ method: 'evm_setTime', params: [`0x${millisecondTimestamp.toString(16)}`] });
  await advanceBlocks(1, provider);
}

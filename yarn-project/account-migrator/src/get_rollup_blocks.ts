import { RollupProcessor } from '@aztec/blockchain';
import { EthAddress } from '@aztec/barretenberg/address';
import { Timer } from '@aztec/barretenberg/timer';
import { JsonRpcProvider } from '@aztec/blockchain';

export async function getRollupBlocks(options: any) {
  const blockTimer = new Timer();
  const ethereumProvider = new JsonRpcProvider(options.url);
  const rollupProcessor = new RollupProcessor(EthAddress.fromString(options.address), ethereumProvider);
  const blocks = await rollupProcessor.getRollupBlocksFrom(options.from, options.confirmations);
  const filteredBlocks = blocks.filter(block => {
    if (block.rollupId < options.from) {
      return false;
    }
    if (options.to && block.rollupId > options.to) {
      return false;
    }
    return true;
  });
  console.log(`Retrieved ${filteredBlocks.length} blocks in ${blockTimer.s()}s`);

  return filteredBlocks;
}

import { BlockSource, Block, BlockServerResponse } from '.';
import { EventEmitter } from 'events';
import { fetch } from '../iso_fetch';
import createDebug from 'debug';

const debug = createDebug('bb:server_block_source');

const toBlock = (block: BlockServerResponse): Block => ({
  ...block,
  txHash: Buffer.from(block.txHash, 'hex'),
  rollupProofData: Buffer.from(block.rollupProofData, 'hex'),
  viewingKeysData: Buffer.from(block.viewingKeysData, 'hex'),
  created: new Date(block.created),
});

export class ServerBlockSource extends EventEmitter implements BlockSource {
  private running = false;

  constructor(private host: URL) {
    super();
  }

  public async start(fromBlock: number = 0) {
    this.running = true;

    while (this.running) {
      try {
        const blocks = await this.getBlocks(fromBlock);
        for (const block of blocks) {
          this.emit('block', block);
          fromBlock = block.blockNum + 1;
        }
      } catch (err) {
        // debug(err);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public stop() {
    this.running = false;
  }

  public async getBlocks(from: number) {
    const url = new URL(`/api/get-blocks`, this.host);
    url.searchParams.append('from', from.toString());

    const response = await fetch(url.toString());
    const jsonBlocks = (await response.json()) as BlockServerResponse[];
    return jsonBlocks.map(toBlock);
  }
}

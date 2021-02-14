import { BlockSource, Block } from '.';
import { EventEmitter } from 'events';
import { fetch } from '../iso_fetch';
import { TxHash } from '../tx_hash';
// import createDebug from 'debug';

export interface BlockServerResponse {
  txHash: string;
  created: string;
  rollupId: number;
  rollupSize: number;
  rollupProofData: string;
  viewingKeysData: string;
  gasPrice: string;
  gasUsed: number;
}

export interface GetBlocksServerResponse {
  latestRollupId: number;
  blocks: BlockServerResponse[];
}

// const debug = createDebug('bb:server_block_source');

const toBlock = (block: BlockServerResponse): Block => ({
  ...block,
  txHash: TxHash.fromString(block.txHash),
  rollupProofData: Buffer.from(block.rollupProofData, 'hex'),
  viewingKeysData: Buffer.from(block.viewingKeysData, 'hex'),
  created: new Date(block.created),
  gasPrice: BigInt(block.gasPrice),
});

export class ServerBlockSource extends EventEmitter implements BlockSource {
  private running = false;
  private latestRollupId = -1;
  protected baseUrl: string;

  constructor(baseUrl: URL) {
    super();
    this.baseUrl = baseUrl.toString().replace(/\/$/, '');
  }

  getLatestRollupId() {
    return this.latestRollupId;
  }

  public async start(from = 0) {
    this.running = true;

    const emitBlocks = async () => {
      try {
        const blocks = await this.getBlocks(from);
        for (const block of blocks) {
          this.emit('block', block);
          from = block.rollupId + 1;
        }
      } catch (err) {
        // debug(err);
      }
    };

    await emitBlocks();

    const poll = async () => {
      while (this.running) {
        await emitBlocks();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };
    poll();
  }

  public stop() {
    this.running = false;
  }

  private async awaitSucceed(fn: () => Promise<Response>) {
    while (true) {
      try {
        const response = await fn();
        if (response.status !== 200) {
          throw new Error(`Bad status code: ${response.status}`);
        }
        return response;
      } catch (err) {
        console.log(err.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  public async getBlocks(from: number) {
    const url = new URL(`${this.baseUrl}/get-blocks`);
    url.searchParams.append('from', from.toString());
    const response = await this.awaitSucceed(() => fetch(url.toString()));
    const result = (await response.json()) as GetBlocksServerResponse;
    this.latestRollupId = result.latestRollupId;
    return result.blocks.map(toBlock);
  }
}

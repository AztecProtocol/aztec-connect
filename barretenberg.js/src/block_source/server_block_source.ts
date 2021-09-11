import { BlockSource, Block } from '.';
import { EventEmitter } from 'events';
import { DefiInteractionNote } from '../note_algorithms';
import { fetch } from '../iso_fetch';
import { TxHash } from '../tx_hash';
// import createDebug from 'debug';
// const debug = createDebug('bb:server_block_source');

export interface BlockServerResponse {
  txHash: string;
  created: string;
  rollupId: number;
  rollupSize: number;
  rollupProofData: string;
  offchainTxData: string[];
  interactionResult: string[];
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
  offchainTxData: block.offchainTxData.map(p => Buffer.from(p, 'hex')),
  interactionResult: block.interactionResult.map(r => DefiInteractionNote.fromBuffer(Buffer.from(r, 'hex'))),
  created: new Date(block.created),
  gasPrice: BigInt(block.gasPrice),
});

export class ServerBlockSource extends EventEmitter implements BlockSource {
  private running = false;
  private runningPromise = Promise.resolve();
  private interruptPromise = Promise.resolve();
  private interruptResolve = () => {};
  private latestRollupId = -1;
  protected baseUrl: string;

  constructor(baseUrl: URL, private pollInterval = 10000) {
    super();
    this.baseUrl = baseUrl.toString().replace(/\/$/, '');
  }

  getLatestRollupId() {
    return this.latestRollupId;
  }

  public async start(from = 0) {
    this.running = true;
    this.interruptPromise = new Promise(resolve => (this.interruptResolve = resolve));

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
        await this.sleepOrInterrupted(this.pollInterval);
      }
    };
    this.runningPromise = poll();
  }

  public stop() {
    this.running = false;
    this.interruptResolve();
    return this.runningPromise;
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

  private async sleepOrInterrupted(ms: number) {
    let timeout!: NodeJS.Timeout;
    const promise = new Promise(resolve => (timeout = setTimeout(resolve, ms)));
    await Promise.race([promise, this.interruptPromise]);
    clearTimeout(timeout);
  }
}

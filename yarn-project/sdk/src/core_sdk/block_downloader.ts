import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { Block } from '@aztec/barretenberg/block_source';
import { MemoryFifo, Semaphore } from '@aztec/barretenberg/fifo';
import { createDebugLogger } from '@aztec/barretenberg/log';

export class BlockDownloader {
  private runningPromise?: Promise<void>;
  private running = false;
  private from = 0;
  private interruptableSleep = new InterruptableSleep();
  private semaphore: Semaphore;
  private queue = new MemoryFifo<Block[]>();
  private genesisTake;
  private debug = createDebugLogger('bb:block_downloader');

  constructor(private rollupProvider: RollupProvider, maxQueueSize: number, initialTreeSize: number) {
    this.semaphore = new Semaphore(maxQueueSize);
    // Choosing 55 as an initial chunk to insert if starting from 0, is an aztec-connect optimisation.
    // The aztec-connect genesis data consists of 73 rollups.
    // Initially inserting 55 brings us to 128, after which we work with chunks of 128 rollups.
    // If not synching from zero, the chunk size is whatever takes us up to the next 128 alignment.
    // This allows for optimal subtree insertions in the client side merkle tree for better sync performance.
    this.genesisTake = 128 - (initialTreeSize % 128);
  }

  public start(from = 0) {
    this.debug(`starting downloading from block ${from}...`);
    this.from = from;

    if (this.running) {
      this.interruptableSleep.interrupt();
      return;
    }

    this.running = true;

    const fn = async () => {
      while (this.running) {
        try {
          // If requesting from block 0, then take the fixed number of blocks to take us to 128 (genesisTake)
          // Otherwise, take blocks as required to get us to a 128 aligned boundary starting from block (128 - initialTreeSize).
          // e.g. we are trying to get to blocks 183, 311, 439 etc....
          const takeValue =
            this.from < this.genesisTake ? this.genesisTake - this.from : 128 - ((this.from - this.genesisTake) % 128);
          const blocks = await this.rollupProvider.getBlocks(this.from, takeValue);

          if (!blocks.length) {
            await this.interruptableSleep.sleep(10000);
            continue;
          }

          this.debug(`downloaded blocks ${this.from} to ${this.from + blocks.length - 1}.`);

          // Blocks if there are maxQueueSize results in the queue, until released after the callback.
          await this.semaphore.acquire();

          this.queue.put(blocks);
          this.from += blocks.length;
        } catch (err) {
          console.log(err);
          await this.interruptableSleep.sleep(10000);
        }
      }
    };

    this.runningPromise = fn();
  }

  public async stop() {
    this.running = false;
    this.interruptableSleep.interrupt();
    this.queue.cancel();
    await this.runningPromise;
  }

  public async getBlocks() {
    const blocks = await this.queue.get();
    if (!blocks) {
      return [];
    }
    this.semaphore.release();
    return blocks;
  }
}

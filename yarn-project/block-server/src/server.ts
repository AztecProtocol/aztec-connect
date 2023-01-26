import { createLogger } from '@aztec/barretenberg/log';
import { ServerRollupProvider } from '@aztec/barretenberg/rollup_provider';
import { serializeBufferArrayToVector } from '@aztec/barretenberg/serialize';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';

export class Server {
  private running = false;
  private runningPromise?: Promise<void>;
  private blockBufferCache: Buffer[] = [];
  private ready = false;
  private serverRollupProvider: ServerRollupProvider;
  private interruptableSleep = new InterruptableSleep();
  private reqMisses = 0;
  private reqMissTime = 0;
  private numInitialSubtreeRoots?: number;

  constructor(falafelUrl: URL, private log = createLogger('Server')) {
    this.serverRollupProvider = new ServerRollupProvider(falafelUrl);
  }

  public async start() {
    this.log('Initializing...');

    const getBlocks = async (from: number) => {
      while (true) {
        try {
          const blocks = await this.serverRollupProvider.getBlocks(from);
          return blocks.map(b => b.toBuffer());
        } catch (err: any) {
          this.log(`getBlocks failed, will retry: ${err.message}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    // Do initial block sync.
    while (true) {
      const blocks = await getBlocks(this.blockBufferCache.length);
      if (blocks.length === 0) {
        break;
      }
      this.blockBufferCache = [...this.blockBufferCache, ...blocks];
      this.log(`Received ${blocks.length} blocks. Total blocks: ${this.blockBufferCache.length}`);
    }

    // After which, we asynchronously kick off a polling loop for the latest blocks.
    this.running = true;
    this.runningPromise = (async () => {
      while (this.running) {
        const blocks = await getBlocks(this.blockBufferCache.length);
        if (blocks.length) {
          this.blockBufferCache = [...this.blockBufferCache, ...blocks];
          this.log(`Received ${blocks.length} blocks. Total blocks: ${this.blockBufferCache.length}`);
        } else {
          this.log(`Received ${blocks.length} blocks. Total blocks: ${this.blockBufferCache.length}`);
          await this.interruptableSleep.sleep(10000);
        }
      }
    })();
    await this.getNumInitialSubtreeRoots();
    this.ready = true;
  }

  public async stop() {
    this.log('Stopping...');
    this.running = false;
    this.ready = false;
    this.interruptableSleep.interrupt(false);
    await this.runningPromise!;
    this.log('Stopped.');
  }

  public isReady() {
    return this.ready;
  }

  public async getLatestRollupId() {
    return await this.serverRollupProvider.getLatestRollupId();
  }

  /*
   * Returns a buffer containing the requested blocks, and a boolean indicating whether there was `take` blocks
   * available. If not, the buffer will contain less than `take` blocks.
   */
  public getBlockBuffers(from: number, take: number): [Buffer, boolean] {
    const start = new Date().getTime();
    const blocks = this.blockBufferCache.slice(from, from + take);
    const time = new Date().getTime() - start;
    if (blocks.length) {
      this.log(`Served ${blocks.length} blocks from ${from} to ${from! + take - 1} in ${time}ms.`);
    } else {
      this.reqMissTime += time;
      this.reqMisses++;
      const batchNum = 1000;
      if (this.reqMisses === batchNum) {
        this.log(`Served ${batchNum} empty results, average time ${this.reqMissTime / batchNum}ms per request.`);
        this.reqMissTime = 0;
        this.reqMisses = 0;
      }
    }
    return [serializeBufferArrayToVector(blocks), blocks.length === take];
  }

  public async getNumInitialSubtreeRoots() {
    if (this.numInitialSubtreeRoots === undefined) {
      const worldState = await this.serverRollupProvider.getInitialWorldState();
      this.numInitialSubtreeRoots = worldState.initialSubtreeRoots.length;
      this.log(`Num initial subtree roots: ${this.numInitialSubtreeRoots}`);
    }
    return this.numInitialSubtreeRoots;
  }
}

import { ServerBlockSource } from '@aztec/barretenberg/block_source';
import { createLogger } from '@aztec/barretenberg/log';
import { numToInt32BE, serializeBufferArrayToVector } from '@aztec/barretenberg/serialize';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';

export class Server {
  private running = false;
  private runningPromise?: Promise<void>;
  private blockBufferCache: Buffer[] = [];
  private ready = false;
  private serverBlockSource: ServerBlockSource;
  private interruptableSleep = new InterruptableSleep();
  private reqMisses = 0;
  private reqMissTime = 0;

  constructor(falafelUrl: URL, private log = createLogger('Server')) {
    this.serverBlockSource = new ServerBlockSource(falafelUrl);
  }

  public async start() {
    this.log('Initializing...');

    const getBlocks = async (from: number) => {
      while (true) {
        try {
          const blocks = await this.serverBlockSource.getBlocks(from);
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
    return await this.serverBlockSource.getLatestRollupId();
  }

  public getBlockBuffers(from?: number, take = 100) {
    const start = new Date().getTime();
    const blocks = from !== undefined ? this.blockBufferCache.slice(from, take ? from + take : undefined) : [];
    const buf = Buffer.concat([numToInt32BE(this.blockBufferCache.length - 1), serializeBufferArrayToVector(blocks)]);
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
    return buf;
  }
}

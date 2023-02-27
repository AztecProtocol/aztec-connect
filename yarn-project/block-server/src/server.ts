import { createLogger } from '@aztec/barretenberg/log';
import { ServerRollupProvider } from '@aztec/barretenberg/rollup_provider';
import { serializeBufferArrayToVector } from '@aztec/barretenberg/serialize';
import { InterruptableSleep, sleep } from '@aztec/barretenberg/sleep';
import { BlockCache } from './blockCache.js';

// @notice A class responsible for managing a cache of blocks.
// @dev Rollup and block are used in the Aztec codebase interchangeably.
export class Server {
  private running = false;
  private runningPromise?: Promise<void>;
  private blockCache: BlockCache;
  private ready = false;
  private serverRollupProvider: ServerRollupProvider;
  private interruptableSleep = new InterruptableSleep();
  private reqMisses = 0;
  private reqMissTime = 0;
  private numInitialSubtreeRoots?: number;

  /*
   * @notice Constructs a new Server instance.
   * @param falafelUrl - The URL of the falafel server.
   * @param initFullSync - Whether to perform a full sync on initialization.
   * @param log - A logger instance.
   * @dev If `initFullSync` is `true`, the server will perform a full sync on initialization.
   *      If `initFullSync` is `false`, the server will only sync the latest block on initialization.
   */
  constructor(falafelUrl: URL, private initFullSync: boolean, private log = createLogger('Server')) {
    this.serverRollupProvider = new ServerRollupProvider(falafelUrl);
    this.blockCache = new BlockCache(log);
  }

  /*
   * @notice A function which does the intial block sync and asynchronously kicks off a polling loop for the latest
   *         blocks.
   */
  public async start() {
    if (this.initFullSync) {
      this.log('Initializing with full sync...');

      // Do initial block sync.
      while (true) {
        this.blockCache.init(0);
        const blocks = await this.getRollupProviderBlocks(this.blockCache.getLatestRollupId());
        if (blocks.length === 0) {
          break;
        }
        this.blockCache.addBlocks(blocks);
        this.log(`Received ${blocks.length} blocks. Total blocks: ${this.blockCache.getLatestRollupId()}`);
      }
    } else {
      // Just sync latest block
      this.log('Initializing without full sync...');

      // ensure we have received the latest rollup ID from falafel
      const ensureGetRollupId = async () => {
        let rollupId = 0;
        let success = false;
        while (!success) {
          try {
            rollupId = await this.getRollupProviderLatestRollupId();
            success = true;
          } catch (err) {
            this.log(`Failed getting latest rollup ID, retrying shortly...`);
            await sleep(5000);
          }
        }
        return rollupId;
      };

      const latestRollupId = await ensureGetRollupId();
      this.blockCache.init(latestRollupId + 1);
      if (latestRollupId !== -1) {
        // can only populate cache if there is a rollup
        const latestBlock = await this.getRollupProviderBlocks(this.blockCache.getLatestRollupId());
        this.blockCache.addBlocks(latestBlock, latestRollupId);
        this.log(`Received ${latestBlock.length} blocks. Total blocks: ${this.blockCache.getLatestRollupId() + 1}`);
      }
    }

    // Asynchronously kick off a polling loop for the latest blocks.
    this.running = true;
    this.runningPromise = (async () => {
      while (this.running) {
        const blocks = await this.getRollupProviderBlocks(this.blockCache.getLength());
        if (blocks.length) {
          this.blockCache.addBlocks(blocks);
          this.log(`Received ${blocks.length} blocks. Total blocks: ${this.blockCache.getLength()}`);
        } else {
          this.log(`Received ${blocks.length} blocks. Total blocks: ${this.blockCache.getLength()}`);
          await this.interruptableSleep.sleep(10000);
        }
      }
    })();
    await this.getNumInitialSubtreeRoots();
    this.ready = true;
  }

  // @notice A function which stops the polling loop.
  public async stop() {
    this.log('Stopping...');
    this.running = false;
    this.ready = false;
    this.interruptableSleep.interrupt(false);
    await this.runningPromise!;
    this.log('Stopped.');
  }

  // @notice Returns whether the server is ready to serve requests --> whether the initial sync finished.
  public isReady() {
    return this.ready;
  }

  /*
   * @notice Returns the latest rollup ID from the rollup provider.
   * @from The block number to start from.
   * @take The number of blocks to return.
   * @returns A buffer containing the requested blocks, and a boolean indicating whether there was `take` blocks
   *         available. If not, the buffer will contain less than `take` blocks.
   */
  public async getBlockBuffers(from: number, take: number): Promise<[Buffer, boolean]> {
    if (!this.blockCache) {
      throw new Error('Block Cache not initiated properly');
    }
    const start = new Date().getTime();
    const [blocks, missingBlockRequests] = this.blockCache.getBlocks(from, take);

    if (missingBlockRequests.length) {
      this.log('Missing blocks from cache. Updating...');
      // request missing blocks from rollup provider
      const results = await Promise.allSettled(
        missingBlockRequests.map(blockRequest =>
          this.getRollupProviderBlocks(blockRequest.from, blockRequest.take).then(blocksRes => {
            // add new blocks to our cache
            this.blockCache.addBlocks(blocksRes, blockRequest.from);

            // update our current result
            blocks.splice(blockRequest.from - from, blockRequest.take, ...blocksRes);
          }),
        ),
      );

      if (results.some(({ status }) => status === 'rejected')) {
        throw new Error('Unable to fetch blocks; Please retry.');
      }
    }

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
    return [serializeBufferArrayToVector(blocks as Buffer[]), blocks.length === take];
  }

  // @notice Returns the latest rollup/block ID stored in the block cache.
  public getLatestRollupId() {
    return this.blockCache.getLatestRollupId();
  }

  public async getNumInitialSubtreeRoots() {
    if (this.numInitialSubtreeRoots === undefined) {
      const worldState = await this.serverRollupProvider.getInitialWorldState();
      this.numInitialSubtreeRoots = worldState.initialSubtreeRoots.length;
      this.log(`Num initial subtree roots: ${this.numInitialSubtreeRoots}`);
    }
    return this.numInitialSubtreeRoots;
  }

  /*
   * @notice Returns the an array of block buffers.
   * @from The block number to start from.
   * @take The number of blocks to fetch.
   * @returns An array of buffers containing the requested blocks.
   */
  private async getRollupProviderBlocks(from: number, take?: number) {
    while (true) {
      try {
        const blocks = await this.serverRollupProvider.getBlocks(from, take);
        return blocks.map(b => b.toBuffer());
      } catch (err: any) {
        this.log(`getBlocks failed, will retry: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // @notice Returns the latest rollup/block ID from the rollup provider.
  private async getRollupProviderLatestRollupId() {
    const rollupId = await this.serverRollupProvider.getLatestRollupId();
    return rollupId;
  }
}

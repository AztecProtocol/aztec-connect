import { Logger } from '@aztec/barretenberg/log';

interface BlockRequest {
  from: number;
  take: number;
}

/*
 * @notice A class that caches blocks of data and provides methods to add and retrieve them.
 * @dev Rollup and block are used in the Aztec codebase interchangeably.
 */
export class BlockCache {
  private blockBufferCache: Buffer[] = [];
  private totalCachedBlocks = 0;

  constructor(private log: Logger) {}

  /*
   * @notice Initializes the cache.
   * @param cacheLength - The length of the cache.
   */
  public init(cacheLength: number) {
    this.blockBufferCache = new Array(cacheLength).fill(undefined);
  }

  /*
   * @notice Adds blocks to the cache.
   * @param blocks - An array of blocks to add to the cache.
   * @param startIndex - The index of the first block in the array to add to the cache.
   * @dev If no `startIndex` is provided, the blocks will be added to the end of the cache.
   *      If a `startIndex` is provided, the blocks will be added to the cache starting at that index.
   */
  public addBlocks(blocks: Buffer[], startIndex?: number) {
    if (startIndex !== undefined && startIndex !== null) {
      this.blockBufferCache.splice(startIndex, blocks.length, ...blocks);
    } else {
      // if no index was given, push to end of array
      this.blockBufferCache.push(...blocks);
    }
    this.totalCachedBlocks += blocks.length;

    this.log(
      `Inserted ${blocks.length} blocks into cache ${
        startIndex === undefined ? 'end' : `from ${startIndex} to ${startIndex + blocks.length}`
      }. Total blocks in cache: ${this.totalCachedBlocks}. Total blocks: ${this.blockBufferCache.length}`,
    );
  }

  /*
   * @notice Returns an array of blocks and an array of requests for blocks that are not in the cache.
   * @param from - The index of the first block to return.
   * @param take - The number of blocks to return.
   * @returns An array of blocks and an array of requests for blocks that are not in the cache.
   * @dev The returned array of blocks will be of length `take`. If a block is not in the cache, the
   *      corresponding index in the returned array will be `undefined`. The returned array of requests
   *      will contain objects with `from` and `take` properties. The `from` property is the index of the
   *      first block that is not in the cache. The `take` property is the number of blocks that are not
   *      in the cache. The `take` property will be 1 if the blocks are not contiguous.
   */
  public getBlocks(from: number, take: number): [(Buffer | undefined)[], BlockRequest[]] {
    // return empty array if request is out of bounds
    if (from > this.getLatestRollupId()) {
      return [[], []];
    }

    const ourBlocks = this.blockBufferCache.slice(from, from + take);
    // check if blocks are all present
    let cont = false;
    const result = ourBlocks.reduce(
      (acc: [(Buffer | undefined)[], BlockRequest[]], item: Buffer | undefined, index: number) => {
        if (!item) {
          // check if this is first empty item in series
          const latestBlockRequest = !!acc[1].length && acc[1][acc[1].length - 1];
          if (!latestBlockRequest || cont === false) {
            acc[1].push({ from: from + index, take: 1 });
            cont = true;
          } else {
            // increase `take` value
            latestBlockRequest.take++;
          }
        } else {
          cont = false;
        }
        acc[0].push(item);

        return acc;
      },
      [new Array<Buffer | undefined>(), new Array<BlockRequest>()],
    );

    return result;
  }

  // @notice Returns the index of the latest rollup/block in the cache.
  public getLatestRollupId() {
    return this.blockBufferCache.length - 1;
  }

  public getLength() {
    return this.blockBufferCache.length;
  }
}

import { Logger } from '@aztec/barretenberg/log';

interface BlockRequest {
  from: number;
  take: number;
}

export class BlockCache {
  private blockBufferCache: Buffer[] = [];
  private totalCachedBlocks = 0;

  constructor(private log: Logger) {}

  public init(cacheLength: number) {
    this.blockBufferCache = new Array(cacheLength).fill(undefined);
  }

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

  public getLatestRollupId() {
    return this.blockBufferCache.length - 1;
  }

  public getLength() {
    return this.blockBufferCache.length;
  }
}

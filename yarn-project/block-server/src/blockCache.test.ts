import { BlockCache } from './blockCache.js';

describe('block_cace', () => {
  let blockCache: BlockCache;
  const blocks: Buffer[] = [];
  const blocksLen = 100;

  beforeAll(() => {
    for (let i = 0; i < blocksLen; i++) {
      const buff = Buffer.alloc(8, 0);
      blocks[i] = buff;
    }
  });

  it('returns correct missing blocks', () => {
    blockCache = new BlockCache(console.log);
    blockCache.init(blocksLen);

    expect(blockCache.getLatestRollupId()).toEqual(blocksLen - 1);
    expect(blockCache.getLength()).toEqual(blocksLen);

    // add block at end of list, lazy init
    blockCache.addBlocks([blocks[blocksLen - 1]], blocksLen - 1);

    const from = 33;
    const to = 75;
    const take = to - from;
    {
      // request some blocks that the cache doesn't have
      const result = blockCache.getBlocks(from, take);

      // no blocks were present
      expect(result[0]).toHaveLength(take);
      result[0].forEach(el => expect(el).toBeUndefined());
      // should return a single request to fetch missing blocks
      expect(result[1]).toHaveLength(1);
      expect(result[1][0].from).toEqual(from);
      expect(result[1][0].take).toEqual(take);
    }
    // add some more blocks
    const addFrom = 45;
    const addTo = 63;
    blockCache.addBlocks(blocks.slice(addFrom, addTo), addFrom);

    {
      // request blocks again
      const result = blockCache.getBlocks(from, take);
      expect(result[0]).toHaveLength(take);
      expect(result[1]).toHaveLength(2);
      result[0].forEach((el, i) => {
        if (i >= addFrom - from && i < addTo - from) {
          expect(el).toEqual(Buffer.alloc(8, 0));
        } else {
          expect(el).toBeUndefined();
        }
      });

      const req1 = result[1][0];
      const req2 = result[1][1];

      expect(req1.from).toEqual(from);
      expect(req1.take).toEqual(addFrom - from);
      expect(req2.from).toEqual(addTo);
      expect(req2.take).toEqual(to - addTo);
    }
  });
});

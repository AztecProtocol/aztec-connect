export interface Block {
  txHash: Buffer;
  created: Date;
  rollupId: number;
  rollupSize: number;
  rollupProofData: Buffer;
  viewingKeysData: Buffer;
}

export interface GetBlocksResponse {
  latestRollupId: number;
  blocks: Block[];
}

export interface BlockSource {
  /**
   * Returns all blocks from rollup id `from`.
   * In the future this will *not* guarantee *all* blocks are returned. It may return a subset, and the
   * client should use `getLatestRollupId()` to determine if it needs to make further requests.
   */
  getBlocks(from: number): Promise<Block[]>;

  /**
   * Starts emitting rollup blocks.
   * All historical blocks must have been emitted before this function returns.
   */
  start(fromBlock?: number);

  stop();

  on(event: 'block', fn: (block: Block) => void);

  removeAllListeners();

  getLatestRollupId(): number;
}

export * from './server_block_source';

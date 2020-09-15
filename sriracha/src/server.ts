import { Block } from 'barretenberg/block_source';
import { nullifierBufferToIndex } from 'barretenberg/client_proofs/join_split_proof';
import { MemoryFifo } from 'barretenberg/fifo';
import { existsAsync, readFileAsync, writeFileAsync } from 'barretenberg/fs_async';
import { HashPath } from 'barretenberg/merkle_tree';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { toBufferBE } from 'bigint-buffer';
import { Blockchain } from 'blockchain';
import { GetHashPathsResponse, HashPathSource } from './hash_path_source';

interface ServerState {
  lastBlock: number;
}

export default class Server implements HashPathSource {
  private queue = new MemoryFifo<() => Promise<void>>();
  private serverState: ServerState = { lastBlock: -1 };

  public constructor(private worldStateDb: WorldStateDb, private blockchain: Blockchain) {}

  public async start() {
    console.log('Synchronising chain state...');

    await this.readState();
    await this.worldStateDb.start();

    // Processing all historical blocks.
    let blocks = await this.blockchain.getBlocks(this.serverState.lastBlock + 1);
    while (blocks.length) {
      for (const block of blocks) {
        await this.handleBlock(block);
      }
      blocks = await this.blockchain.getBlocks(this.serverState.lastBlock + 1);
    }

    await this.writeState();

    // Subscribe for new blocks.
    this.blockchain.on('block', (b: Block) => this.queue.put(() => this.handleBlock(b)));
    this.blockchain.start(this.serverState.lastBlock + 1);

    this.queue.process(fn => fn());
  }

  public async stop() {
    this.queue.cancel();
    this.blockchain.stop();
  }

  private async readState() {
    if (await existsAsync('./data/state')) {
      const state = await readFileAsync('./data/state');
      this.serverState = JSON.parse(state.toString('utf8'));
    }
  }

  private async writeState() {
    await writeFileAsync('./data/state', JSON.stringify(this.serverState));
  }

  public async getHashPath(treeIndex: number, index: Buffer) {
    const nullBigInt = nullifierBufferToIndex(index);
    return new Promise<HashPath>(resolve => {
      this.queue.put(async () => resolve(await this.worldStateDb.getHashPath(treeIndex, nullBigInt)));
    });
  }

  public async getHashPaths(treeIndex: number, nullifiers: Buffer[]) {
    const nullifierIndices = nullifiers.map(n => nullifierBufferToIndex(n));
    return new Promise<GetHashPathsResponse>(resolve => {
      this.queue.put(async () => resolve(await this.computeTempHashPaths(treeIndex, nullifierIndices)));
    });
  }

  public async computeTempHashPaths(treeIndex: number, nullifiers: bigint[]) {
    const oldHashPaths: HashPath[] = [];
    const newHashPaths: HashPath[] = [];
    const newRoots: Buffer[] = [];
    const oldRoot: Buffer = this.worldStateDb.getRoot(treeIndex);

    for (const nullifier of nullifiers) {
      const oldHashPath = await this.worldStateDb.getHashPath(treeIndex, nullifier);
      oldHashPaths.push(oldHashPath);
      await this.addNullifier(nullifier);
      const newHashPath = await this.worldStateDb.getHashPath(treeIndex, nullifier);
      newHashPaths.push(newHashPath);
      newRoots.push(this.worldStateDb.getRoot(treeIndex));
    }

    await this.worldStateDb.rollback();

    return { oldHashPaths, newHashPaths, newRoots, oldRoot };
  }

  private async addNullifier(nullifier: bigint) {
    await this.worldStateDb.put(1, nullifier, toBufferBE(1n, 64));
  }

  private async handleBlock(block: Block) {
    const { rollupSize, rollupProofData, viewingKeysData, blockNum } = block;
    const { dataStartIndex, innerProofData, rollupId } = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);

    console.log(`Processing rollup ${rollupId} in block ${blockNum}...`);

    for (let i = 0; i < innerProofData.length; ++i) {
      const tx = innerProofData[i];
      await this.worldStateDb.put(0, BigInt(dataStartIndex + i * rollupSize), tx.newNote1);
      await this.worldStateDb.put(0, BigInt(dataStartIndex + i * rollupSize + 1), tx.newNote2);
      await this.worldStateDb.put(1, nullifierBufferToIndex(tx.nullifier1), toBufferBE(1n, 64));
      await this.worldStateDb.put(1, nullifierBufferToIndex(tx.nullifier2), toBufferBE(1n, 64));
    }
    if (innerProofData.length < rollupSize) {
      await this.worldStateDb.put(0, BigInt(dataStartIndex + rollupSize * 2 - 1), Buffer.alloc(64, 0));
    }
    await this.worldStateDb.put(2, BigInt(rollupId + 1), this.worldStateDb.getRoot(0));

    await this.worldStateDb.commit();

    this.serverState.lastBlock = blockNum;
    await this.writeState();
  }
}

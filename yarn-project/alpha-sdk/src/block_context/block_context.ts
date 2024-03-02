import { Block, DefiInteractionEvent } from '@aztec/barretenberg/block_source';
import { Pedersen } from '@aztec/barretenberg/crypto';
import { MemoryMerkleTree } from '@aztec/barretenberg/merkle_tree';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { MemorySerialQueue } from '../serial_queue/index.js';

/**
 * Block Context is designed to wrap a block received from the rollup provider
 * and percolate through the sdk, existing for the duration that the block is 'processed'.
 * It provides an opportunity for 'once per block' caching/optimization across all entities interested in the block
 * Requires mutex protection due to the concurrent nature of user states
 */
export class BlockContext {
  private serialQueue = new MemorySerialQueue();
  private subtree?: MemoryMerkleTree;
  private startIndex?: number;

  constructor(
    public rollup: RollupProofData,
    private rollupSize: number,
    public mined: Date,
    public interactionResult: DefiInteractionEvent[],
    public offchainTxData: Buffer[],
    private pedersen: Pedersen,
  ) {}

  static fromBlock(block: Block, pedersen: Pedersen) {
    return new BlockContext(
      RollupProofData.decode(block.encodedRollupProofData),
      block.rollupSize,
      block.mined,
      block.interactionResult,
      block.offchainTxData,
      pedersen,
    );
  }

  /**
   * Provides the hash path at the given index of the block's immutable sub-tree
   * Will validate that the index provided is within the range encapsulated by the sub-tree
   * Lazy initialises the sub-tree from the rollup's input notes so the tree is built
   * at most once
   */
  public async getBlockSubtreeHashPath(index: number) {
    return await this.serialQueue.push(async () => {
      if (!this.subtree) {
        const numNotesInFullRollup = WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX * this.rollupSize;
        this.startIndex = this.rollup.dataStartIndex;
        const maxIndex = this.startIndex + numNotesInFullRollup;
        if (index < this.startIndex || index >= maxIndex) {
          throw new Error('Index out of bounds.');
        }
        const notes = this.rollup.innerProofData.flatMap(x => [x.noteCommitment1, x.noteCommitment2]);
        const allNotes = [...notes, ...Array(numNotesInFullRollup - notes.length).fill(MemoryMerkleTree.ZERO_ELEMENT)];
        this.subtree = await MemoryMerkleTree.new(allNotes, this.pedersen);
      }
      return this.subtree.getHashPath(index - this.startIndex!);
    });
  }
}

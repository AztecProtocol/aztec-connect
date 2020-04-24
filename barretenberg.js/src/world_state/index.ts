import { MerkleTree } from '../merkle_tree';
import { LevelUp } from 'levelup';
import { BarretenbergWasm } from '../wasm';
import { Blake2s } from '../crypto/blake2s';
import { Pedersen } from '../crypto/pedersen';
import { BlockSource, Block } from '../block_source';

export class WorldState {
  private tree: MerkleTree;

  constructor(private db: LevelUp, private wasm: BarretenbergWasm, private blockSource: BlockSource) {
    this.tree = new MerkleTree(db, new Pedersen(wasm), new Blake2s(wasm), "data", 32);
    blockSource.on('block', b => this.handleBlock(b));
  }

  private handleBlock(block: Block) {

  }
}
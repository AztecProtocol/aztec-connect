import { BlockSource, Block } from 'barretenberg-es/block_source';
import { EventEmitter } from 'events';
import createDebug from 'debug';
import { JoinSplitVerifier } from 'barretenberg-es/client_proofs/join_split_proof';
import { RollupProvider, Proof } from './rollup_provider';

const debug = createDebug('bb:local_rollup_provider');

export class LocalRollupProvider extends EventEmitter implements BlockSource, RollupProvider {
  private blockNum = 0;
  private dataTreeSize = 0;

  constructor(private joinSplitVerifier: JoinSplitVerifier) {
    super();
  }

  async sendProof(proof: Buffer) {
    // REMOVE ME
    const verified = true;
    // const verified = await this.joinSplitVerifier.verifyProof(proofData);
    debug(`verified: ${verified}`);
    if (!verified) {
      return;
    }

    const outputNote1 = proof.slice(2 * 32, 2 * 32 + 64);
    const outputNote2 = proof.slice(4 * 32, 4 * 32 + 64);
    const nullifer1 = proof.slice(7 * 32 + 16, 7 * 32 + 32);
    const nullifer2 = proof.slice(8 * 32 + 16, 8 * 32 + 32);
    const block: Block = {
      blockNum: this.blockNum,
      dataStartIndex: this.dataTreeSize,
      dataEntries: [outputNote1, outputNote2],
      nullifiers: [nullifer1, nullifer2],
    }

    this.blockNum++;
    this.dataTreeSize += 2;

    this.emit('block', block);
  }

  appendBlock(blockNum: number, size: number) {
    if (blockNum > this.blockNum) {
      this.blockNum = blockNum;
      this.dataTreeSize += size;
    }
  }
}

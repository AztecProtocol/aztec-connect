import { BlockSource, Block } from '../block_source';
import { EventEmitter } from 'events';
import createDebug from 'debug';
import { JoinSplitVerifier } from '../client_proofs/join_split_proof';
import { RollupProvider, Proof } from '.';

const debug = createDebug('bb:local_rollup_provider');

export class LocalRollupProvider extends EventEmitter implements BlockSource, RollupProvider {
  private blockNum = 0;
  private dataTreeSize = 0;
  private running = false;

  constructor(private joinSplitVerifier: JoinSplitVerifier) {
    super();
  }

  start() {
    this.running = true;
  }

  async sendProof({ proofData, viewingKeys }: Proof) {
    if (!this.running) {
      return;
    }

    const verified = await this.joinSplitVerifier.verifyProof(proofData);
    debug(`verified: ${verified}`);
    if (!verified) {
      return;
    }

    const outputNote1 = proofData.slice(2 * 32, 2 * 32 + 64);
    const outputNote2 = proofData.slice(4 * 32, 4 * 32 + 64);
    const nullifer1 = proofData.slice(7 * 32 + 16, 7 * 32 + 32);
    const nullifer2 = proofData.slice(8 * 32 + 16, 8 * 32 + 32);
    const block: Block = {
      blockNum: this.blockNum,
      rollupId: this.blockNum,
      dataStartIndex: this.dataTreeSize,
      numDataEntries: 2,
      dataEntries: [outputNote1, outputNote2],
      nullifiers: [nullifer1, nullifer2],
      viewingKeys,
    };

    this.blockNum++;
    this.dataTreeSize += 2;

    this.emit('block', block);
  }

  async status() {
    return {
      dataSize: this.dataTreeSize,
      dataRoot: Buffer.alloc(32, 0),
      nullRoot: Buffer.alloc(32, 0),
    };
  }

  stop() {
    this.running = false;
  }
}

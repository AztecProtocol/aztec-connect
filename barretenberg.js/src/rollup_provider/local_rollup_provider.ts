import { BlockSource, Block } from '../block_source';
import { EventEmitter } from 'events';
import createDebug from 'debug';
import { JoinSplitVerifier } from '../client_proofs/join_split_proof';
import { RollupProvider, Proof } from '.';

const debug = createDebug('bb:local_rollup_provider');

export class LocalRollupProvider extends EventEmitter implements BlockSource, RollupProvider {
  private blockNum = 0;
  private dataTreeSize = 0;

  constructor(private joinSplitVerifier: JoinSplitVerifier) {
    super();
  }

  async sendProof({ proofData, encViewingKey1, encViewingKey2 }: Proof) {
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
      dataEntries: [outputNote1, outputNote2],
      nullifiers: [nullifer1, nullifer2],
      viewingKeys: [encViewingKey1, encViewingKey2]
    }

    this.blockNum++;
    this.dataTreeSize += 2;

    this.emit('block', block);
  }
}

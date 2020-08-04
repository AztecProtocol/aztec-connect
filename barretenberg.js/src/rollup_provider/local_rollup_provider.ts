import { BlockSource, Block } from '../block_source';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import createDebug from 'debug';
import { JoinSplitVerifier } from '../client_proofs/join_split_proof';
import { RollupProvider, Proof } from './rollup_provider';

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
      throw new Error('Server is not running.');
    }

    const verified = await this.joinSplitVerifier.verifyProof(proofData);
    debug(`verified: ${verified}`);
    if (!verified) {
      throw new Error('Proof not verified.');
    }

    const dataRoot = proofData.slice(96, 128);
    const nullRoot = proofData.slice(160, 192);
    const outputNote1 = proofData.slice(2 * 32, 2 * 32 + 64);
    const outputNote2 = proofData.slice(4 * 32, 4 * 32 + 64);
    const nullifer1 = proofData.slice(7 * 32 + 16, 7 * 32 + 32);
    const nullifer2 = proofData.slice(8 * 32 + 16, 8 * 32 + 32);
    const block: Block = {
      txHash: randomBytes(32),
      blockNum: this.blockNum,
      rollupId: this.blockNum,
      dataRoot,
      nullRoot,
      dataStartIndex: this.dataTreeSize,
      numDataEntries: 2,
      dataEntries: [outputNote1, outputNote2],
      nullifiers: [nullifer1, nullifer2],
      viewingKeys,
    };

    this.blockNum++;
    this.dataTreeSize += 2;

    this.emit('block', block);

    return {
      txHash: randomBytes(32),
    };
  }

  async status() {
    return {
      chainId: 0,
      networkOrHost: '',
      rollupContractAddress: '',
      tokenContractAddress: '',
      dataSize: this.dataTreeSize,
      dataRoot: Buffer.alloc(32, 0),
      nullRoot: Buffer.alloc(32, 0),
    };
  }

  stop() {
    this.running = false;
  }
}

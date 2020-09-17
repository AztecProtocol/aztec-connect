import { BlockSource, Block } from '../block_source';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import createDebug from 'debug';
import { JoinSplitProof, JoinSplitVerifier } from '../client_proofs/join_split_proof';
import { RollupProvider } from './rollup_provider';
import { EthAddress } from '../address';
import { RollupProofData } from '../rollup_proof';
import { Proof } from '../rollup_provider';

const debug = createDebug('bb:local_rollup_provider');

export class LocalRollupProvider extends EventEmitter implements RollupProvider {
  private blockNum = 0;
  private dataTreeSize = 0;
  private running = false;
  private blocks: Block[] = [];
  private dataRoot = Buffer.alloc(32, 0);
  private nullRoot = Buffer.alloc(32, 0);

  constructor(private joinSplitVerifier: JoinSplitVerifier) {
    super();
  }

  getLatestRollupId() {
    return this.blocks.length
      ? RollupProofData.getRollupIdFromBuffer(this.blocks[this.blocks.length - 1].rollupProofData)
      : -1;
  }

  start() {
    this.running = true;
  }

  async getBlocks(from: number) {
    return this.blocks.slice(from);
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

    // TODO - should construct a rollup proof
    const proof = new JoinSplitProof(proofData, viewingKeys);
    const dataRoot = proofData.slice(96, 128);
    const nullRoot = proofData.slice(160, 192);
    const block: Block = {
      txHash: randomBytes(32),
      blockNum: this.blockNum,
      rollupSize: 1,
      rollupProofData: proofData,
      viewingKeysData: Buffer.concat(viewingKeys),
      created: new Date(),
    };

    this.blocks.push(block);
    this.blockNum++;
    this.dataTreeSize += 2;
    this.dataRoot = dataRoot;
    this.nullRoot = nullRoot;

    this.emit('block', block);

    return randomBytes(32);
  }

  async status() {
    return {
      chainId: 0,
      networkOrHost: '',
      rollupContractAddress: EthAddress.ZERO,
      tokenContractAddress: EthAddress.ZERO,
      dataSize: this.dataTreeSize,
      dataRoot: this.dataRoot,
      nullRoot: this.nullRoot,
    };
  }

  stop() {
    this.running = false;
  }
}

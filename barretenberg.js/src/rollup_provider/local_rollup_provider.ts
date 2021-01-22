import { Block } from '../block_source';
import { EventEmitter } from 'events';
import { assetIds } from '../client_proofs';
import { ProofData } from '../client_proofs/proof_data';
import { RollupProvider } from './rollup_provider';
import { EthAddress } from '../address';
import { RollupProofData } from '../rollup_proof';
import { Proof } from '../rollup_provider';
import { TxHash } from './tx_hash';

export class LocalRollupProvider extends EventEmitter implements RollupProvider {
  private blockNum = 0;
  private dataTreeSize = 0;
  private running = false;
  private blocks: Block[] = [];
  private dataRoot = Buffer.alloc(32, 0);
  private nullRoot = Buffer.alloc(32, 0);
  private rootRoot = Buffer.alloc(32, 0);

  constructor() {
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

    const proof = new ProofData(proofData, viewingKeys);
    const block: Block = {
      txHash: TxHash.random(),
      rollupId: this.blockNum,
      rollupSize: 1,
      rollupProofData: proofData,
      viewingKeysData: Buffer.concat(viewingKeys),
      created: new Date(),
    };

    this.blocks.push(block);
    this.blockNum++;
    this.dataTreeSize += 2;
    this.dataRoot = proof.noteTreeRoot;
    this.emit('block', block);

    return block.txHash;
  }

  async getStatus() {
    const fees = new Map();
    assetIds.forEach(assetId => {
      fees.set(assetId, BigInt(0));
    });

    return {
      serviceName: 'local',
      chainId: 0,
      networkOrHost: '',
      rollupContractAddress: EthAddress.ZERO,
      tokenContractAddresses: [EthAddress.ZERO],
      nextRollupId: this.blockNum,
      dataSize: this.dataTreeSize,
      dataRoot: this.dataRoot,
      nullRoot: this.nullRoot,
      rootRoot: this.rootRoot,
      escapeOpen: false,
      numEscapeBlocksRemaining: 0,
      fees,
    };
  }

  async getPendingNoteNullifiers() {
    return [];
  }

  stop() {
    this.running = false;
  }
}

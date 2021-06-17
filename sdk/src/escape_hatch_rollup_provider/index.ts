import { Proof, RollupProvider, RollupProviderStatus } from '@aztec/barretenberg/rollup_provider';
import { Blockchain } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';

export class EscapeHatchRollupProvider implements RollupProvider {
  constructor(private blockchain: Blockchain) {}

  async sendProof(proof: Proof) {
    const tx = await this.blockchain.createEscapeHatchProofTx(
      proof.proofData,
      proof.viewingKeys.map(vk => vk.toBuffer()),
      proof.depositSignature,
    );
    return this.blockchain.sendTx(tx);
  }

  async getStatus(): Promise<RollupProviderStatus> {
    return {
      blockchainStatus: await this.blockchain.getBlockchainStatus(),
      txFees: [],
      txsPerRollup: 0,
      pendingTxCount: 0,
      nextPublishTime: new Date(0),
    } as RollupProviderStatus;
  }

  getBlocks(from: number) {
    return this.blockchain.getBlocks(from);
  }

  start(fromBlock?: number) {
    return this.blockchain.start(fromBlock);
  }

  stop() {
    return this.blockchain.stop();
  }

  on(event: 'block', fn: (block: Block) => void) {
    return this.blockchain.on(event, fn);
  }

  removeAllListeners() {
    return this.blockchain.removeAllListeners();
  }

  getLatestRollupId(): number {
    return this.blockchain.getLatestRollupId();
  }

  async getPendingNoteNullifiers() {
    return [];
  }
}

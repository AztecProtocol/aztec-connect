import { Proof, RollupProvider, RollupProviderStatus, TxHash } from 'barretenberg/rollup_provider';
import { Blockchain } from 'barretenberg/blockchain';
import { Block } from 'barretenberg/block_source';

export class EscapeHatchRollupProvider implements RollupProvider {
  constructor(private blockchain: Blockchain) {}

  sendProof(proof: Proof): Promise<TxHash> {
    return this.blockchain.sendEscapeHatchProof(
      proof.proofData,
      proof.viewingKeys.map(vk => vk.toBuffer()),
      proof.depositSignature,
    );
  }

  async getStatus(): Promise<RollupProviderStatus> {
    return {
      blockchainStatus: await this.blockchain.getBlockchainStatus(),
      minFees: [],
    };
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

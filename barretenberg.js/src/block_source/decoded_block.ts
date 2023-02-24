import { RollupProofData } from '../rollup_proof/rollup_proof_data.js';
import { Block } from './index.js';

// Convenience class that present a unified interface over all of the data contained in a 'Block'
// Both block level and proof level information exposed
// Block decoding is lazy and concealed from consumer
export class DecodedBlock {
  private decoded?: RollupProofData;

  constructor(private block: Block) {}

  get rollupId() {
    return this.getDecodedProof().rollupId;
  }
  get gasPrice() {
    return this.block.gasPrice;
  }
  get gasUsed() {
    return this.block.gasUsed;
  }
  get subtreeRoot() {
    return this.block.subtreeRoot;
  }
  get dataStartIndex() {
    return this.getDecodedProof().dataStartIndex;
  }
  get oldDataRoot() {
    return this.getDecodedProof().oldDataRoot;
  }
  get newDataRoot() {
    return this.getDecodedProof().newDataRoot;
  }
  get oldNullRoot() {
    return this.getDecodedProof().oldNullRoot;
  }
  get newNullRoot() {
    return this.getDecodedProof().newNullRoot;
  }
  get oldDataRootsRoot() {
    return this.getDecodedProof().oldDataRootsRoot;
  }
  get newDataRootsRoot() {
    return this.getDecodedProof().newDataRootsRoot;
  }
  get oldDefiRoot() {
    return this.getDecodedProof().oldDefiRoot;
  }
  get newDefiRoot() {
    return this.getDecodedProof().newDefiRoot;
  }
  get defiDepositSums() {
    return this.getDecodedProof().defiDepositSums;
  }
  get assetIds() {
    return this.getDecodedProof().assetIds;
  }
  get totalTxFees() {
    return this.getDecodedProof().totalTxFees;
  }
  get prevDefiInteractionHash() {
    return this.getDecodedProof().prevDefiInteractionHash;
  }
  get rollupBeneficiary() {
    return this.getDecodedProof().rollupBeneficiary;
  }
  get innerProofData() {
    return this.getDecodedProof().innerProofData;
  }
  get ethTxHash() {
    return this.block.txHash;
  }
  get rollupSize() {
    return this.block.rollupSize;
  }
  get numRollupTxs() {
    return this.block.offchainTxData.length;
  }
  get minedTime() {
    return this.block.mined;
  }
  get defiInteractionEvents() {
    return this.block.interactionResult;
  }
  get offchainData() {
    return this.block.offchainTxData;
  }
  get rollupHash() {
    return this.getDecodedProof().rollupHash;
  }
  get rawProofData() {
    return this.block.encodedRollupProofData;
  }

  private getDecodedProof() {
    if (!this.decoded) {
      this.decoded = RollupProofData.decode(this.block.encodedRollupProofData);
    }
    return this.decoded;
  }
}

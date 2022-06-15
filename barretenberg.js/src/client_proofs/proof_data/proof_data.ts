import { createTxId } from './create_tx_id';
import { ProofId } from './proof_id';

enum ProofDataFields {
  PROOF_ID,
  NOTE_COMMITMENT_1,
  NOTE_COMMITMENT_2,
  NULLIFIER_1,
  NULLIFIER_2,
  PUBLIC_VALUE,
  PUBLIC_OWNER,
  PUBLIC_ASSET_ID,
  NOTE_TREE_ROOT,
  TX_FEE,
  TX_FEE_ASSET_ID,
  BRIDGE_ID,
  DEFI_DEPOSIT_VALUE,
  DEFI_ROOT,
  BACKWARD_LINK,
  ALLOW_CHAIN,
}

enum ProofDataOffsets {
  PROOF_ID = ProofDataFields.PROOF_ID * 32 + 28,
  NOTE_COMMITMENT_1 = ProofDataFields.NOTE_COMMITMENT_1 * 32,
  NOTE_COMMITMENT_2 = ProofDataFields.NOTE_COMMITMENT_2 * 32,
  NULLIFIER_1 = ProofDataFields.NULLIFIER_1 * 32,
  NULLIFIER_2 = ProofDataFields.NULLIFIER_2 * 32,
  PUBLIC_VALUE = ProofDataFields.PUBLIC_VALUE * 32,
  PUBLIC_OWNER = ProofDataFields.PUBLIC_OWNER * 32,
  PUBLIC_ASSET_ID = ProofDataFields.PUBLIC_ASSET_ID * 32,
  NOTE_TREE_ROOT = ProofDataFields.NOTE_TREE_ROOT * 32,
  TX_FEE = ProofDataFields.TX_FEE * 32,
  TX_FEE_ASSET_ID = ProofDataFields.TX_FEE_ASSET_ID * 32,
  BRIDGE_ID = ProofDataFields.BRIDGE_ID * 32,
  DEFI_DEPOSIT_VALUE = ProofDataFields.DEFI_DEPOSIT_VALUE * 32,
  DEFI_ROOT = ProofDataFields.DEFI_ROOT * 32,
  BACKWARD_LINK = ProofDataFields.BACKWARD_LINK * 32,
  ALLOW_CHAIN = ProofDataFields.ALLOW_CHAIN * 32,
}

/**
 * Represents tx proof data as returned by the proof generator.
 * Differs to on chain data, in that not all data here is actually published.
 * Fields that differ between proofs, or natural buffers, are of type Buffer.
 * Fields that are always of fixed type/meaning are converted.
 */
export class ProofData {
  static readonly NUM_PUBLIC_INPUTS = 17;
  static readonly NUM_PUBLISHED_PUBLIC_INPUTS = 8;

  static getProofIdFromBuffer(rawProofData: Buffer) {
    return rawProofData.readUInt32BE(ProofDataOffsets.PROOF_ID);
  }

  public readonly txId: Buffer;

  public readonly proofId: ProofId;
  public readonly noteCommitment1: Buffer;
  public readonly noteCommitment2: Buffer;
  public readonly nullifier1: Buffer;
  public readonly nullifier2: Buffer;
  public readonly publicValue: Buffer;
  public readonly publicOwner: Buffer;
  public readonly publicAssetId: Buffer;

  public readonly noteTreeRoot: Buffer;
  public readonly txFee: Buffer;
  public readonly txFeeAssetId: Buffer;
  public readonly bridgeId: Buffer;
  public readonly defiDepositValue: Buffer;
  public readonly defiRoot: Buffer;

  public readonly backwardLink: Buffer;
  public readonly allowChain: Buffer;

  constructor(public rawProofData: Buffer) {
    this.proofId = rawProofData.readUInt32BE(ProofDataOffsets.PROOF_ID);
    this.noteCommitment1 = rawProofData.slice(
      ProofDataOffsets.NOTE_COMMITMENT_1,
      ProofDataOffsets.NOTE_COMMITMENT_1 + 32,
    );
    this.noteCommitment2 = rawProofData.slice(
      ProofDataOffsets.NOTE_COMMITMENT_2,
      ProofDataOffsets.NOTE_COMMITMENT_2 + 32,
    );
    this.nullifier1 = rawProofData.slice(ProofDataOffsets.NULLIFIER_1, ProofDataOffsets.NULLIFIER_1 + 32);
    this.nullifier2 = rawProofData.slice(ProofDataOffsets.NULLIFIER_2, ProofDataOffsets.NULLIFIER_2 + 32);
    this.publicValue = rawProofData.slice(ProofDataOffsets.PUBLIC_VALUE, ProofDataOffsets.PUBLIC_VALUE + 32);
    this.publicOwner = rawProofData.slice(ProofDataOffsets.PUBLIC_OWNER, ProofDataOffsets.PUBLIC_OWNER + 32);
    this.publicAssetId = rawProofData.slice(ProofDataOffsets.PUBLIC_ASSET_ID, ProofDataOffsets.PUBLIC_ASSET_ID + 32);

    // Not published as part of inner proofs.
    this.noteTreeRoot = rawProofData.slice(ProofDataOffsets.NOTE_TREE_ROOT, ProofDataOffsets.NOTE_TREE_ROOT + 32);
    this.txFee = rawProofData.slice(ProofDataOffsets.TX_FEE, ProofDataOffsets.TX_FEE + 32);
    this.txFeeAssetId = rawProofData.slice(ProofDataOffsets.TX_FEE_ASSET_ID, ProofDataOffsets.TX_FEE_ASSET_ID + 32);
    this.bridgeId = rawProofData.slice(ProofDataOffsets.BRIDGE_ID, ProofDataOffsets.BRIDGE_ID + 32);
    this.defiDepositValue = rawProofData.slice(
      ProofDataOffsets.DEFI_DEPOSIT_VALUE,
      ProofDataOffsets.DEFI_DEPOSIT_VALUE + 32,
    );
    this.defiRoot = rawProofData.slice(ProofDataOffsets.DEFI_ROOT, ProofDataOffsets.DEFI_ROOT + 32);
    this.backwardLink = rawProofData.slice(ProofDataOffsets.BACKWARD_LINK, ProofDataOffsets.BACKWARD_LINK + 32);
    this.allowChain = rawProofData.slice(ProofDataOffsets.ALLOW_CHAIN, ProofDataOffsets.ALLOW_CHAIN + 32);

    this.txId = createTxId(rawProofData.slice(0, ProofData.NUM_PUBLISHED_PUBLIC_INPUTS * 32));
  }

  get allowChainFromNote1() {
    const allowChain = this.allowChain.readUInt32BE(28);
    return [1, 3].includes(allowChain);
  }

  get allowChainFromNote2() {
    const allowChain = this.allowChain.readUInt32BE(28);
    return [2, 3].includes(allowChain);
  }

  get feeAssetId() {
    return this.txFeeAssetId.readUInt32BE(28);
  }
}

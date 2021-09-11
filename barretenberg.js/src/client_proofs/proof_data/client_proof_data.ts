import { BridgeId } from '../../bridge_id';
import { numToUInt32BE } from '../../serialize';
import { createTxId } from './create_tx_id';
import { ProofId } from './proof_id';

/**
 * Represents tx proof data as returned by the proof generator.
 * Differs to on chain data, in that not all data here is actually published.
 * Fields that differ between proofs, or natural buffers, are of type Buffer.
 * Fields that are always of fixed type/meaning are converted.
 */
export class ClientProofData {
  static readonly NUM_PUBLIC_INPUTS = 12;
  static readonly NUM_PUBLISHED_PUBLIC_INPUTS = 10;

  public readonly txId: Buffer;
  public readonly proofId: ProofId;
  public readonly noteCommitment1: Buffer;
  public readonly noteCommitment2: Buffer;
  public readonly nullifier1: Buffer;
  public readonly nullifier2: Buffer;
  public readonly assetId: Buffer;
  public readonly publicInput: Buffer;
  public readonly publicOutput: Buffer;
  public readonly inputOwner: Buffer;
  public readonly outputOwner: Buffer;
  public readonly noteTreeRoot: Buffer;
  public readonly txFee: Buffer;
  public readonly txFeeAssetId: Buffer;
  public readonly bridgeId: Buffer;
  public readonly defiDepositValue: Buffer;
  public readonly defiRoot: Buffer;

  constructor(public rawProofData: Buffer) {
    let dataStart = 0;
    this.proofId = rawProofData.readUInt32BE(dataStart + 28);
    dataStart += 32;
    this.publicInput = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.publicOutput = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.assetId = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.noteCommitment1 = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.noteCommitment2 = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.nullifier1 = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.nullifier2 = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.inputOwner = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.outputOwner = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;

    // Not published as part of inner proofs.
    this.noteTreeRoot = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.txFee = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const isDefiProof = [ProofId.DEFI_DEPOSIT, ProofId.DEFI_CLAIM].includes(this.proofId);
    this.bridgeId = isDefiProof ? this.assetId : Buffer.alloc(32);
    const assetId = this.proofId === ProofId.JOIN_SPLIT ? this.assetId.readUInt32BE(28) : 0;
    this.txFeeAssetId = numToUInt32BE(isDefiProof ? BridgeId.fromBuffer(this.bridgeId).inputAssetId : assetId, 32);
    this.defiDepositValue = this.proofId === ProofId.DEFI_DEPOSIT ? this.publicOutput : Buffer.alloc(32);
    this.defiRoot = this.proofId === ProofId.DEFI_CLAIM ? this.inputOwner : Buffer.alloc(32);

    this.txId = createTxId(rawProofData.slice(0, ClientProofData.NUM_PUBLISHED_PUBLIC_INPUTS * 32));
  }
}

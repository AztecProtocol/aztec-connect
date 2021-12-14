import { createTxId } from './create_tx_id';
import { ProofId } from './proof_id';

/**
 * Represents tx proof data as returned by the proof generator.
 * Differs to on chain data, in that not all data here is actually published.
 * Fields that differ between proofs, or natural buffers, are of type Buffer.
 * Fields that are always of fixed type/meaning are converted.
 */
export class ProofData {
  static readonly NUM_PUBLIC_INPUTS = 17;
  static readonly NUM_PUBLISHED_PUBLIC_INPUTS = 8;

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
    let dataStart = 0;
    this.proofId = rawProofData.readUInt32BE(dataStart + 28);
    dataStart += 32;
    this.noteCommitment1 = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.noteCommitment2 = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.nullifier1 = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.nullifier2 = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.publicValue = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.publicOwner = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.publicAssetId = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;

    // Not published as part of inner proofs.
    this.noteTreeRoot = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.txFee = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.txFeeAssetId = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.bridgeId = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.defiDepositValue = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.defiRoot = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.backwardLink = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;
    this.allowChain = rawProofData.slice(dataStart, dataStart + 32);
    dataStart += 32;

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
}

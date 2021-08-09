import { toBigIntBE } from '../../bigint_buffer';
import { createTxId } from './create_tx_id';
import { ProofId } from './proof_id';

/**
 * Represents tx proof data as returned by the proof generator.
 * Differs to on chain data, in that not all data here is actually published.
 * Fields that differ between proofs, or natural buffers, are of type Buffer.
 * Fields that are always of fixed type/meaning are converted.
 */
export class ProofData {
  static readonly NUM_PUBLIC_INPUTS = 12;
  static readonly NUM_PUBLISHED_PUBLIC_INPUTS = 10;

  public readonly txId: Buffer;
  public readonly proofId: ProofId;
  public readonly publicInput: Buffer;
  public readonly publicOutput: Buffer;
  public readonly assetId: Buffer;
  public readonly noteCommitment1: Buffer;
  public readonly noteCommitment2: Buffer;
  public readonly nullifier1: Buffer;
  public readonly nullifier2: Buffer;
  public readonly inputOwner: Buffer;
  public readonly outputOwner: Buffer;
  public readonly noteTreeRoot: Buffer;
  public readonly txFee: bigint;

  constructor(public rawProofData: Buffer) {
    this.proofId = rawProofData.readUInt32BE(0 * 32 + 28);
    this.publicInput = rawProofData.slice(1 * 32, 1 * 32 + 32);
    this.publicOutput = rawProofData.slice(2 * 32, 2 * 32 + 32);
    this.assetId = rawProofData.slice(3 * 32, 3 * 32 + 32);
    this.noteCommitment1 = rawProofData.slice(4 * 32, 4 * 32 + 32);
    this.noteCommitment2 = rawProofData.slice(5 * 32, 5 * 32 + 32);
    this.nullifier1 = rawProofData.slice(6 * 32, 6 * 32 + 32);
    this.nullifier2 = rawProofData.slice(7 * 32, 7 * 32 + 32);
    this.inputOwner = rawProofData.slice(8 * 32, 8 * 32 + 32);
    this.outputOwner = rawProofData.slice(9 * 32, 9 * 32 + 32);

    // Not published as part of inner proofs.
    this.noteTreeRoot = rawProofData.slice(10 * 32, 10 * 32 + 32);
    this.txFee = toBigIntBE(rawProofData.slice(11 * 32, 11 * 32 + 32));

    this.txId = createTxId(rawProofData.slice(0, ProofData.NUM_PUBLISHED_PUBLIC_INPUTS * 32));
  }
}

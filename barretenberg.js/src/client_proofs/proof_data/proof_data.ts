import { toBigIntBE } from '../../bigint_buffer';
import { createTxId } from './create_tx_id';
import { ProofId } from './proof_id';

/**
 * Represents tx proof data as returned by the proof generator.
 * Differs to on chain data, in that not data here is actually published.
 * Fields that differ between proofs, or natural buffers, are of type Buffer.
 * Fields that are always of fixed type/meaning are converted.
 */
export class ProofData {
  static readonly NUM_PUBLIC_INPUTS = 14;

  public readonly txId: Buffer;
  public readonly proofId: ProofId;
  public readonly publicInput: Buffer;
  public readonly publicOutput: Buffer;
  public readonly assetId: Buffer;
  public readonly newNote1: Buffer;
  public readonly newNote2: Buffer;
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
    this.newNote1 = rawProofData.slice(4 * 32, 4 * 32 + 64);
    this.newNote2 = rawProofData.slice(6 * 32, 6 * 32 + 64);
    this.nullifier1 = rawProofData.slice(8 * 32, 8 * 32 + 32);
    this.nullifier2 = rawProofData.slice(9 * 32, 9 * 32 + 32);
    this.inputOwner = rawProofData.slice(10 * 32, 10 * 32 + 32);
    this.outputOwner = rawProofData.slice(11 * 32, 11 * 32 + 32);

    // Not published as part of inner proofs.
    this.noteTreeRoot = rawProofData.slice(12 * 32, 12 * 32 + 32);
    this.txFee = toBigIntBE(rawProofData.slice(13 * 32, 13 * 32 + 32));

    this.txId = createTxId(rawProofData);
  }
}

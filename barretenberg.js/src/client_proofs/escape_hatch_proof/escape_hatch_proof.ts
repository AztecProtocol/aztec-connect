import { createHash } from 'crypto';

export class EscapeHatchProof {
  static NUM_PUBLIC_INPUTS = 9;

  // number to follow this includes unpublished public inputs
  // such as the noteTreeRoot and accountNullifier
  static NUM_PUBLISHED_PUBLIC_INPUTS = 9;

  public proofId: Buffer;
  public publicOutput: Buffer;
  public outputOwner: Buffer;
  public oldDataRoot: Buffer;
  public newDataRoot: Buffer;
  public oldNullRoot: Buffer;
  public newNullRoot: Buffer;
  public oldDataRootsRoot: Buffer;
  public newDataRootsRoot: Buffer;

  // public noteTreeRoot: Buffer;
  // public accountNullifier: Buffer;

  constructor(public proofData: Buffer) {
    this.oldDataRoot = proofData.slice(0 * 32, 0 * 32 + 32);
    this.newDataRoot = proofData.slice(1 * 32, 1 * 32 + 32);
    this.oldNullRoot = proofData.slice(2 * 32, 2 * 32 + 32);
    this.newNullRoot = proofData.slice(3 * 32, 3 * 32 + 32);
    this.oldDataRootsRoot = proofData.slice(4 * 32, 4 * 32 + 32);
    this.newDataRootsRoot = proofData.slice(5 * 32, 5 * 32 + 32);

    this.proofId = proofData.slice(6 * 32, 6 * 32 + 32);
    this.publicOutput = proofData.slice(7 * 32, 7 * 32 + 32);
    this.outputOwner = proofData.slice(8 * 32 + 12, 8 * 32 + 32);

    // Not published as part of inner proofs.
    // this.noteTreeRoot = proofData.slice(11 * 32, 11 * 32 + 32);
    // this.accountNullifier = proofData.slice(12 * 32, 12 * 32 + 32);
  }

  getTxId() {
    return createHash('sha256')
      .update(this.proofData.slice(0, EscapeHatchProof.NUM_PUBLISHED_PUBLIC_INPUTS * 32))
      .digest();
  }

  /**
   * The data we sign over for authorizing deposits, consists of the data that is published on chain.
   * This excludes the last two fields, the noteTreeRoot and the accountNullifier.
   */
  getDepositSigningData() {
    return this.proofData.slice(0, EscapeHatchProof.NUM_PUBLISHED_PUBLIC_INPUTS * 32);
  }
}

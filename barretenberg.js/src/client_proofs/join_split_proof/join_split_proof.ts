import { createHash } from 'crypto';

export class JoinSplitProof {
  static NUM_PUBLIC_INPUTS = 14;
  static NUM_PUBLISHED_PUBLIC_INPUTS = 12;

  public proofId: number;
  public publicInput: Buffer;
  public publicOutput: Buffer;
  public assetId: number;
  public newNote1: Buffer;
  public newNote2: Buffer;
  public nullifier1: Buffer;
  public nullifier2: Buffer;
  public inputOwner: Buffer;
  public outputOwner: Buffer;
  public noteTreeRoot: Buffer;
  public accountNullifier: Buffer;
  public dataRootsIndex = 0;

  constructor(public proofData: Buffer, public viewingKeys: Buffer[], public signature?: Buffer) {
    this.proofId = proofData.readUInt32BE(0 * 32 + 28);
    this.publicInput = proofData.slice(1 * 32, 1 * 32 + 32);
    this.publicOutput = proofData.slice(2 * 32, 2 * 32 + 32);
    this.assetId = proofData.readUInt32BE(3 * 32 + 28);
    this.newNote1 = proofData.slice(4 * 32, 4 * 32 + 64);
    this.newNote2 = proofData.slice(6 * 32, 6 * 32 + 64);
    this.nullifier1 = proofData.slice(8 * 32, 8 * 32 + 32);
    this.nullifier2 = proofData.slice(9 * 32, 9 * 32 + 32);
    this.inputOwner = proofData.slice(10 * 32 + 12, 10 * 32 + 32);
    this.outputOwner = proofData.slice(11 * 32 + 12, 11 * 32 + 32);

    // Not published as part of inner proofs.
    this.noteTreeRoot = proofData.slice(12 * 32, 12 * 32 + 32);
    this.accountNullifier = proofData.slice(13 * 32, 13 * 32 + 32);
  }

  getTxId() {
    return createHash('sha256')
      .update(this.proofData.slice(0, JoinSplitProof.NUM_PUBLISHED_PUBLIC_INPUTS * 32))
      .digest();
  }

  /**
   * TODO: Get rid of this in favor of just signing tx id.
   * The data we sign over for authorizing deposits, consists of the data that is published on chain.
   * This excludes the last two fields, the noteTreeRoot and the accountNullifier.
   */
  getDepositSigningData() {
    return this.proofData.slice(0, JoinSplitProof.NUM_PUBLISHED_PUBLIC_INPUTS * 32);
  }
}

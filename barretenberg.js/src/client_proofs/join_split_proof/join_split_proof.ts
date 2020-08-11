export class JoinSplitProof {
  public publicInput: Buffer;
  public publicOutput: Buffer;
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
    this.publicInput = proofData.slice(0, 32);
    this.publicOutput = proofData.slice(32, 64);
    this.newNote1 = proofData.slice(2 * 32, 2 * 32 + 64);
    this.newNote2 = proofData.slice(4 * 32, 4 * 32 + 64);
    this.nullifier1 = proofData.slice(6 * 32 + 16, 6 * 32 + 32);
    this.nullifier2 = proofData.slice(7 * 32 + 16, 7 * 32 + 32);
    this.inputOwner = proofData.slice(8 * 32 + 12, 8 * 32 + 32);
    this.outputOwner = proofData.slice(9 * 32 + 12, 9 * 32 + 32);
    this.noteTreeRoot = proofData.slice(10 * 32, 10 * 32 + 32);
    this.accountNullifier = proofData.slice(11 * 32 + 16, 11 * 32 + 32);
  }

  /**
   * The data we sign over for authorizing deposits, consists of the data that is published on chain.
   * This is currently the first 10 public input field values (the notes take 2 each).
   * This excludes the last two fields, the noteTreeRoot and the accountNullifier.
   */
  getDepositSigningData() {
    return this.proofData.slice(0, 10 * 32);
  }
}

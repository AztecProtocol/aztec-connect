export class JoinSplitProof {
  public publicInput: Buffer;
  public publicOutput: Buffer;
  public noteTreeRoot: Buffer;
  public newNote1: Buffer;
  public newNote2: Buffer;
  public nullifier1: Buffer;
  public nullifier2: Buffer;

  constructor(public proofData: Buffer, public viewingKeys: Buffer[]) {
    this.publicInput = proofData.slice(0, 32);
    this.publicOutput = proofData.slice(32, 64);
    this.newNote1 = proofData.slice(2 * 32, 2 * 32 + 64);
    this.newNote2 = proofData.slice(4 * 32, 4 * 32 + 64);
    this.noteTreeRoot = proofData.slice(6 * 32, 6 * 32 + 32);
    this.nullifier1 = proofData.slice(7 * 32 + 16, 7 * 32 + 32);
    this.nullifier2 = proofData.slice(8 * 32 + 16, 8 * 32 + 32);
  }
}

interface InnerProof {
  publicInput: Buffer;
  publicOutput: Buffer;
  newNote1: Buffer;
  newNote2: Buffer;
  nullifier1: Buffer;
  nullifier2: Buffer;
}

export class RollupProof {
  public dataStartIndex: number;
  public oldDataRoot: Buffer;
  public newDataRoot: Buffer;
  public oldNullRoot: Buffer;
  public newNullRoot: Buffer;
  public oldRootRoot: Buffer;
  public numTxs: number;
  public innerProofData: InnerProof[] = [];

  constructor(public proofData: Buffer) {
    this.dataStartIndex = proofData.readUInt32BE(28);
    this.oldDataRoot = proofData.slice(32, 64);
    this.newDataRoot = proofData.slice(64, 96);
    this.oldNullRoot = proofData.slice(96, 128);
    this.newNullRoot = proofData.slice(128, 160);
    this.oldRootRoot = proofData.slice(160, 192);
    this.numTxs = proofData.readUInt32BE(220);

    const innerLength = 32 * 8;
    for (let i = 0; i < this.numTxs; ++i) {
      const startIndex = 224 + i * innerLength;
      const innerData = proofData.slice(startIndex, startIndex + innerLength);
      this.innerProofData[i] = {
        publicInput: innerData.slice(0, 32),
        publicOutput: innerData.slice(32, 64),
        newNote1: innerData.slice(2 * 32, 2 * 32 + 64),
        newNote2: innerData.slice(4 * 32, 4 * 32 + 64),
        nullifier1: innerData.slice(6 * 32 + 16, 6 * 32 + 32),
        nullifier2: innerData.slice(7 * 32 + 16, 7 * 32 + 32),
      };
    }
  }
}

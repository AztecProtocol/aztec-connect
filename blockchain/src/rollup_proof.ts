export interface InnerProof {
  publicInput: Buffer;
  publicOutput: Buffer;
  newNote1: Buffer;
  newNote2: Buffer;
  nullifier1: Buffer;
  nullifier2: Buffer;
  inputOwner: Buffer;
  outputOwner: Buffer;
}

export class RollupProof {
  public rollupId: number;
  public dataStartIndex: number;
  public oldDataRoot: Buffer;
  public newDataRoot: Buffer;
  public oldNullRoot: Buffer;
  public newNullRoot: Buffer;
  public oldDataRootsRoot: Buffer;
  public newDataRootsRoot: Buffer;
  public numTxs: number;
  public innerProofData: InnerProof[] = [];

  constructor(public proofData: Buffer) {
    this.rollupId = proofData.readUInt32BE(28);
    this.dataStartIndex = proofData.readUInt32BE(60);
    this.oldDataRoot = proofData.slice(64, 96);
    this.newDataRoot = proofData.slice(96, 128);
    this.oldNullRoot = proofData.slice(128, 160);
    this.newNullRoot = proofData.slice(160, 192);
    this.oldDataRootsRoot = proofData.slice(192, 224);
    this.newDataRootsRoot = proofData.slice(224, 256);
    this.numTxs = proofData.readUInt32BE(284);

    const innerLength = 32 * 10;
    for (let i = 0; i < this.numTxs; ++i) {
      const startIndex = 288 + i * innerLength;
      const innerData = proofData.slice(startIndex, startIndex + innerLength);
      this.innerProofData[i] = {
        publicInput: innerData.slice(0, 32),
        publicOutput: innerData.slice(32, 64),
        newNote1: innerData.slice(2 * 32, 2 * 32 + 64),
        newNote2: innerData.slice(4 * 32, 4 * 32 + 64),
        nullifier1: innerData.slice(6 * 32 + 16, 6 * 32 + 32),
        nullifier2: innerData.slice(7 * 32 + 16, 7 * 32 + 32),
        inputOwner: innerData.slice(8 * 32 + 12, 8 * 32 + 32),
        outputOwner: innerData.slice(9 * 32 + 12, 9 * 32 + 32),
      };
    }
  }
}

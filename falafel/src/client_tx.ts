export class ClientTx {
  constructor(
    public noteTreeRoot: Buffer,
    public newNote1: Buffer,
    public newNote2: Buffer,
    public nullifier1: Buffer,
    public nullifier2: Buffer,
    public publicInput: Buffer,
    public publicOutput: Buffer
  ) {}

  static fromProof(proofData: Buffer) {
    return new ClientTx(
      proofData.slice(0, 32),
      proofData.slice(32, 64),
      proofData.slice(64, 96),
      proofData.slice(96, 128),
      proofData.slice(128, 160),
      proofData.slice(160, 192),
      proofData.slice(192, 224)
    );
  }
}

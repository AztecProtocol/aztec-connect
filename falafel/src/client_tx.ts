import { toBigIntBE } from 'bigint-buffer';

export class ClientTx {
    public publicInput: bigint;
    public publicOutput: bigint;
    public noteTreeRoot: Buffer;
    public newNote1: Buffer;
    public newNote2: Buffer;
    public nullifier1: bigint;
    public nullifier2: bigint;

  constructor(public proofData: Buffer) {
    this.publicInput = toBigIntBE(proofData.slice(0, 32));
    this.publicOutput = toBigIntBE(proofData.slice(32, 64));
    this.newNote1 = proofData.slice(2 * 32, 2 * 32 + 64);
    this.newNote2 = proofData.slice(4 * 32, 4 * 32 + 64);
    this.noteTreeRoot = proofData.slice(6 * 32, 6 * 32 + 32);
    const nullifer1Buf = proofData.slice(7 * 32 + 16, 7 * 32 + 32);
    this.nullifier1 = toBigIntBE(nullifer1Buf);
    const nullifer2Buf = proofData.slice(8 * 32 + 16, 8 * 32 + 32);
    this.nullifier2 = toBigIntBE(nullifer2Buf);
  }
}

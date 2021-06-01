import { toBufferBE } from 'bigint-buffer';
import { GrumpkinAddress } from '../../address';
import { numToUInt32BE } from '../../serialize';

export class ClaimNoteTxData {
  static EMPTY = new ClaimNoteTxData(BigInt(0), BigInt(0), GrumpkinAddress.one(), 0, Buffer.alloc(32));

  constructor(
    public value: bigint,
    public bridgeId: bigint,
    public ownerPubKey: GrumpkinAddress,
    public ownerNonce: number,
    public noteSecret: Buffer,
  ) {}

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      toBufferBE(this.bridgeId, 32),
      this.ownerPubKey.toBuffer(),
      numToUInt32BE(this.ownerNonce),
      this.noteSecret,
      numToUInt32BE(0),
    ]);
  }

  equals(note: ClaimNoteTxData) {
    return this.toBuffer().equals(note.toBuffer());
  }
}

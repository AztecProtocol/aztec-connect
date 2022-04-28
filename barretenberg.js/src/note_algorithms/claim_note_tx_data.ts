import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';

export class ClaimNoteTxData {
  static EMPTY = new ClaimNoteTxData(BigInt(0), BridgeId.ZERO, Buffer.alloc(32), Buffer.alloc(32));
  static SIZE = ClaimNoteTxData.EMPTY.toBuffer().length;

  constructor(
    public value: bigint,
    public bridgeId: BridgeId,
    public partialStateSecret: Buffer,
    public inputNullifier: Buffer,
  ) {}

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      this.bridgeId.toBuffer(),
      this.partialStateSecret,
      this.inputNullifier,
    ]);
  }

  equals(note: ClaimNoteTxData) {
    return this.toBuffer().equals(note.toBuffer());
  }

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const value = toBigIntBE(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const bridgeId = BridgeId.fromBuffer(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const partialStateSecret = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const inputNullifier = buf.slice(dataStart, dataStart + 32);
    return new ClaimNoteTxData(value, bridgeId, partialStateSecret, inputNullifier);
  }
}

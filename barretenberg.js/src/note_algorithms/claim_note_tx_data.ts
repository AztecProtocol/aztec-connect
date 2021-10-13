import { toBufferBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';

export class ClaimNoteTxData {
  static EMPTY = new ClaimNoteTxData(BigInt(0), BridgeId.ZERO, Buffer.alloc(32), Buffer.alloc(32));

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
}

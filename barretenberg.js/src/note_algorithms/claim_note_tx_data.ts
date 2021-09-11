import { toBufferBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';

export class ClaimNoteTxData {
  static EMPTY = new ClaimNoteTxData(BigInt(0), BridgeId.ZERO, Buffer.alloc(32));

  constructor(public value: bigint, public bridgeId: BridgeId, public noteSecret: Buffer) {}

  toBuffer() {
    return Buffer.concat([toBufferBE(this.value, 32), this.bridgeId.toBuffer(), this.noteSecret]);
  }

  equals(note: ClaimNoteTxData) {
    return this.toBuffer().equals(note.toBuffer());
  }
}

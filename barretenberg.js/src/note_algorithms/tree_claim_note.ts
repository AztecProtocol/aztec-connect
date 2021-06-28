import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { randomBytes } from 'crypto';
import { BridgeId } from '../bridge_id';
import { numToUInt32BE } from '../serialize';

export class TreeClaimNote {
  static LENGTH = 132;
  static EMPTY = new TreeClaimNote(BigInt(0), BridgeId.ZERO, 0, Buffer.alloc(64));

  constructor(
    public value: bigint,
    public bridgeId: BridgeId,
    public defiInteractionNonce: number,
    public partialState: Buffer,
  ) {}

  static random() {
    return new TreeClaimNote(
      toBigIntBE(randomBytes(32)),
      BridgeId.random(),
      randomBytes(4).readUInt32BE(),
      randomBytes(64),
    );
  }

  static fromBuffer(buf: Buffer) {
    const value = toBigIntBE(buf.slice(0, 32));
    let offset = 32;
    const bridgeId = BridgeId.fromBuffer(buf.slice(offset, offset + BridgeId.LENGTH));
    offset += bridgeId.toBuffer().length;
    const defiInteractionNonce = buf.slice(offset).readUInt32BE();
    offset += 4;
    const partialState = buf.slice(offset, offset + 64);
    return new TreeClaimNote(value, bridgeId, defiInteractionNonce, partialState);
  }

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      this.bridgeId.toBuffer(),
      numToUInt32BE(this.defiInteractionNonce),
      this.partialState,
    ]);
  }

  equals(note: TreeClaimNote) {
    return this.toBuffer().equals(note.toBuffer());
  }
}

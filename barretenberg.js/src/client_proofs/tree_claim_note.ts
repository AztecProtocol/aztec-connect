import { toBufferBE } from 'bigint-buffer';
import { numToUInt32BE } from '../serialize';

export class TreeClaimNote {
  constructor(
    public value: bigint,
    public bridgeId: bigint,
    public noteSecret: Buffer,
    public defiInteractionNonce: number,
  ) {}

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      toBufferBE(this.bridgeId, 32),
      this.noteSecret,
      numToUInt32BE(this.defiInteractionNonce),
    ]);
  }
}

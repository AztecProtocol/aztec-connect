import { toBufferBE } from 'bigint-buffer';
import { numToUInt32BE } from '../serialize';

export class TreeClaimNote {
  constructor(
    public value: bigint,
    public bridgeId: bigint,
    public defiInteractionNonce: number,
    public partialState: Buffer,
  ) {}

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      toBufferBE(this.bridgeId, 32),
      numToUInt32BE(this.defiInteractionNonce),
      this.partialState,
    ]);
  }
}

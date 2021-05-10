import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { createHash, createCipheriv, createDecipheriv } from 'crypto';
import { Grumpkin } from '../ecc/grumpkin';
import { GrumpkinAddress } from '../address';
import { numToUInt8, numToUInt32BE } from '../serialize';
import { AssetId } from '../asset';
import { ViewingKey } from '../viewing_key';
import { NoteAlgorithms } from './note_algorithms';

export class TreeClaimNote {
  constructor(
    public value: bigint,
    public bridgeId: bigint,
    public noteSecret: Buffer,
    public defiInteractionNonce: number
  ) { }

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      toBufferBE(this.bridgeId, 32),
      this.noteSecret,
      numToUInt32BE(this.defiInteractionNonce),
    ]);
  }
}
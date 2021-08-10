import { GrumpkinAddress } from '../address';
import { toBufferBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';
import { Grumpkin } from '../ecc/grumpkin';
import { ViewingKey } from '../viewing_key';
import { deriveNoteSecret } from './derive_note_secret';

export class ClaimNoteTxData {
  static EMPTY = new ClaimNoteTxData(BigInt(0), BridgeId.ZERO, Buffer.alloc(32));

  constructor(public value: bigint, public bridgeId: BridgeId, public noteSecret: Buffer) {}

  static createFromEphPriv(
    value: bigint,
    bridgeId: BridgeId,
    ownerPubKey: GrumpkinAddress,
    ephPrivKey: Buffer,
    grumpkin: Grumpkin,
  ) {
    const noteSecret = deriveNoteSecret(ownerPubKey, ephPrivKey, grumpkin);
    return new ClaimNoteTxData(value, bridgeId, noteSecret);
  }

  static createFromEphPub(
    value: bigint,
    bridgeId: BridgeId,
    ephPubKey: GrumpkinAddress,
    ownerPrivKey: Buffer,
    grumpkin: Grumpkin,
  ) {
    const noteSecret = deriveNoteSecret(ephPubKey, ownerPrivKey, grumpkin);
    return new ClaimNoteTxData(value, bridgeId, noteSecret);
  }

  toBuffer() {
    return Buffer.concat([toBufferBE(this.value, 32), this.bridgeId.toBuffer(), this.noteSecret]);
  }

  equals(note: ClaimNoteTxData) {
    return this.toBuffer().equals(note.toBuffer());
  }

  getViewingKey(ownerPubKey: GrumpkinAddress, ephPrivKey: Buffer, grumpkin: Grumpkin) {
    const noteBuf = Buffer.concat([toBufferBE(this.value, 32), this.bridgeId.toBuffer().slice(0, 8)]);
    return ViewingKey.createFromEphPriv(noteBuf, ownerPubKey, ephPrivKey, grumpkin);
  }
}

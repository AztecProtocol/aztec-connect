import { toBufferBE } from '../bigint_buffer';
import { GrumpkinAddress } from '../address';
import { Grumpkin } from '../ecc/grumpkin';
import { numToUInt32BE } from '../serialize';
import { ViewingKey } from '../viewing_key';
import { AccountId } from '../account_id';
import { BridgeId } from '../bridge_id';
import { deriveNoteSecret } from './derive_note_secret';

export class ClaimNoteTxData {
  static EMPTY = new ClaimNoteTxData(BigInt(0), BridgeId.ZERO, GrumpkinAddress.one(), 0, Buffer.alloc(32));

  constructor(
    public value: bigint,
    public bridgeId: BridgeId,
    public ownerPubKey: GrumpkinAddress,
    public ownerNonce: number,
    public noteSecret: Buffer,
  ) {}

  static createFromEphPriv(
    value: bigint,
    bridgeId: BridgeId,
    owner: AccountId,
    ephPrivKey: Buffer,
    grumpkin: Grumpkin,
  ) {
    const noteSecret = deriveNoteSecret(owner.publicKey, ephPrivKey, grumpkin);
    return new ClaimNoteTxData(value, bridgeId, owner.publicKey, owner.nonce, noteSecret);
  }

  static createFromEphPub(
    value: bigint,
    bridgeId: BridgeId,
    owner: AccountId,
    ephPubKey: GrumpkinAddress,
    ownerPrivKey: Buffer,
    grumpkin: Grumpkin,
  ) {
    const noteSecret = deriveNoteSecret(ephPubKey, ownerPrivKey, grumpkin);
    return new ClaimNoteTxData(value, bridgeId, owner.publicKey, owner.nonce, noteSecret);
  }

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      this.bridgeId.toBuffer(),
      this.ownerPubKey.toBuffer(),
      numToUInt32BE(this.ownerNonce),
      this.noteSecret,
    ]);
  }

  equals(note: ClaimNoteTxData) {
    return this.toBuffer().equals(note.toBuffer());
  }

  getViewingKey(ownerPubKey: GrumpkinAddress, ephPrivKey: Buffer, grumpkin: Grumpkin) {
    const noteBuf = Buffer.concat([toBufferBE(this.value, 32), this.bridgeId.toBuffer().slice(0, 8)]);
    return ViewingKey.createFromEphPriv(noteBuf, ownerPubKey, ephPrivKey, grumpkin);
  }
}

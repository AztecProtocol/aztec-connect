import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { GrumpkinAddress } from '../../address';
import { AssetId } from '../../asset';
import { Grumpkin } from '../../ecc/grumpkin';
import { numToUInt32BE } from '../../serialize';
import { DecryptedNote, ViewingKey } from '../../viewing_key';
import { deriveNoteSecret } from '../derive_note_secret';
import { NoteAlgorithms } from '../note_algorithms';

export class TreeNote {
  static EMPTY = new TreeNote(GrumpkinAddress.one(), BigInt(0), 0, 0, Buffer.alloc(32));

  constructor(
    public ownerPubKey: GrumpkinAddress,
    public value: bigint,
    public assetId: AssetId,
    public nonce: number,
    public noteSecret: Buffer,
  ) {}

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      numToUInt32BE(this.assetId),
      numToUInt32BE(this.nonce),
      this.ownerPubKey.toBuffer(),
      this.noteSecret,
    ]);
  }

  getViewingKey(ephPrivKey: Buffer, grumpkin: Grumpkin) {
    const noteBuf = Buffer.concat([toBufferBE(this.value, 32), numToUInt32BE(this.assetId), numToUInt32BE(this.nonce)]);
    return ViewingKey.createFromEphPriv(noteBuf, this.ownerPubKey, ephPrivKey, grumpkin);
  }

  static createFromEphPriv(
    ownerPubKey: GrumpkinAddress,
    value: bigint,
    assetId: AssetId,
    nonce: number,
    ephPrivKey: Buffer,
    grumpkin: Grumpkin,
    noteVersion = 1,
  ) {
    const noteSecret = deriveNoteSecret(ownerPubKey, ephPrivKey, grumpkin, noteVersion);
    return new TreeNote(ownerPubKey, value, assetId, nonce, noteSecret);
  }

  static createFromEphPub(
    ownerPubKey: GrumpkinAddress,
    value: bigint,
    assetId: AssetId,
    nonce: number,
    ephPubKey: GrumpkinAddress,
    ownerPrivKey: Buffer,
    grumpkin: Grumpkin,
    noteVersion = 1,
  ) {
    const noteSecret = deriveNoteSecret(ephPubKey, ownerPrivKey, grumpkin, noteVersion);
    return new TreeNote(ownerPubKey, value, assetId, nonce, noteSecret);
  }

  static recover({ noteBuf, noteSecret }: DecryptedNote, ownerPubKey: GrumpkinAddress) {
    const value = toBigIntBE(noteBuf.slice(0, 32));
    const assetId = noteBuf.readUInt32BE(32);
    const nonce = noteBuf.readUInt32BE(36);
    return new TreeNote(ownerPubKey, value, assetId, nonce, noteSecret);
  }
}

export const recoverTreeNotes = (
  decryptedNotes: (DecryptedNote | undefined)[],
  noteCommitments: Buffer[],
  privateKey: Buffer,
  grumpkin: Grumpkin,
  noteAlgorithms: NoteAlgorithms,
) => {
  const ownerPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
  return decryptedNotes.map((decrypted, i) => {
    if (!decrypted) {
      return;
    }

    const noteCommitment = noteCommitments[i];

    // Note version 1
    {
      const note = TreeNote.recover(decrypted, ownerPubKey);
      const commitment = noteAlgorithms.encryptNote(note);
      if (commitment.equals(noteCommitment)) {
        return note;
      }
    }

    // Note version 0
    {
      const noteSecret = deriveNoteSecret(decrypted.ephPubKey, privateKey, grumpkin, 0);
      const note = TreeNote.recover({ ...decrypted, noteSecret }, ownerPubKey);
      const commitment = noteAlgorithms.encryptNote(note);
      if (commitment.equals(noteCommitment)) {
        return note;
      }
    }
  });
};

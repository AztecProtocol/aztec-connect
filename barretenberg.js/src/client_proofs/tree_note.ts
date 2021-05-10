import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { createHash, createCipheriv, createDecipheriv } from 'crypto';
import { Grumpkin } from '../ecc/grumpkin';
import { GrumpkinAddress } from '../address';
import { numToUInt8, numToUInt32BE } from '../serialize';
import { AssetId } from '../asset';
import { ViewingKey } from '../viewing_key';
import { NoteAlgorithms } from './note_algorithms';
import { deriveNoteSecret } from './derive_note_secret';

export class TreeNote {
  constructor(
    public ownerPubKey: GrumpkinAddress,
    public value: bigint,
    public assetId: AssetId,
    public nonce: number,
    public noteSecret: Buffer,
  ) { }

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      numToUInt32BE(this.assetId),
      numToUInt32BE(this.nonce),
      this.ownerPubKey.toBuffer(),
      this.noteSecret,
    ]);
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
}

export function createEphemeralPrivKey(grumpkin: Grumpkin) {
  return grumpkin.getRandomFr();
}

function deriveAESSecret(ecdhPubKey: GrumpkinAddress, ecdhPrivKey: Buffer, grumpkin: Grumpkin) {
  const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
  const secretBuffer = Buffer.concat([sharedSecret, numToUInt8(1)]);
  const hash = createHash('sha256').update(secretBuffer).digest();
  return hash;
}

/**
 * Returns the AES encrypted "viewing key".
 * [AES:[64 bytes owner public key][32 bytes value][32 bytes secret]][64 bytes ephemeral public key]
 */
export function encryptNote(note: TreeNote, ephPrivKey: Buffer, grumpkin: Grumpkin) {
  const ephPubKey = grumpkin.mul(Grumpkin.one, ephPrivKey);
  const aesSecret = deriveAESSecret(note.ownerPubKey, ephPrivKey, grumpkin);
  const aesKey = aesSecret.slice(0, 16);
  const iv = aesSecret.slice(16, 32);

  const cipher = createCipheriv('aes-128-cbc', aesKey, iv);
  cipher.setAutoPadding(false); // plaintext is already a multiple of 16 bytes
  const noteBuf = Buffer.concat([toBufferBE(note.value, 32), numToUInt32BE(note.assetId), numToUInt32BE(note.nonce)]);
  const plaintext = Buffer.concat([iv.slice(0, 8), noteBuf]);
  const result = new ViewingKey(Buffer.concat([cipher.update(plaintext), cipher.final(), ephPubKey]));
  return result;
}

export function decryptNote(viewingKey: ViewingKey, privateKey: Buffer, grumpkin: Grumpkin, noteVersion = 1) {
  const encryptedNote = viewingKey.toBuffer();
  const ephPubKey = new GrumpkinAddress(encryptedNote.slice(-64));
  const aesSecret = deriveAESSecret(ephPubKey, privateKey, grumpkin);
  const aesKey = aesSecret.slice(0, 16);
  const iv = aesSecret.slice(16, 32);

  try {
    const decipher = createDecipheriv('aes-128-cbc', aesKey, iv);
    decipher.setAutoPadding(false); // plaintext is already a multiple of 16 bytes
    const plaintext = Buffer.concat([decipher.update(encryptedNote.slice(0, -64)), decipher.final()]);
    const testIvSlice = plaintext.slice(0, 8);
    if (!testIvSlice.equals(iv.slice(0, 8))) {
      return undefined;
    }

    const noteBuf = plaintext.slice(8);
    const ownerPubKey = grumpkin.mul(Grumpkin.one, privateKey);
    const noteType = TreeNote.createFromEphPub(
      new GrumpkinAddress(ownerPubKey),
      toBigIntBE(noteBuf.slice(0, 32)),
      noteBuf.readUInt32BE(32),
      noteBuf.readUInt32BE(36),
      ephPubKey,
      privateKey,
      grumpkin,
      noteVersion,
    );
    return noteType;
  } catch (err) {
    return;
  }
}

export async function batchDecryptNotes(
  viewingKeys: Buffer,
  privateKey: Buffer,
  grumpkin: Grumpkin,
  noteCommitments: Buffer[],
  noteAlgorithms: NoteAlgorithms,
) {
  const decryptedNoteLength = 41;
  const dataBuf = await noteAlgorithms.batchDecryptNotes(viewingKeys, privateKey);
  const ownerPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));

  const notes = noteCommitments.map((noteCommitment, i) => {
    const noteBuf = dataBuf.slice(i * decryptedNoteLength, i * decryptedNoteLength + decryptedNoteLength);
    if (noteBuf.length === 0) {
      return;
    }
    const success = noteBuf[0];
    const value = toBigIntBE(noteBuf.slice(1, 33));
    const assetId = noteBuf.readUInt32BE(33);
    const nonce = noteBuf.readUInt32BE(37);
    const ephPubKey = new GrumpkinAddress(viewingKeys.slice((i + 1) * ViewingKey.SIZE - 64, (i + 1) * ViewingKey.SIZE));

    if (success) {
      const noteV0 = TreeNote.createFromEphPub(ownerPubKey, value, assetId, nonce, ephPubKey, privateKey, grumpkin, 0);
      const noteV1 = TreeNote.createFromEphPub(ownerPubKey, value, assetId, nonce, ephPubKey, privateKey, grumpkin, 1);
      const noteV0Commitment = noteAlgorithms.encryptNote(noteV0.toBuffer());
      const noteV1Commitment = noteAlgorithms.encryptNote(noteV1.toBuffer());
      if (noteV0Commitment.equals(noteCommitment)) {
        return noteV0;
      } else if (noteV1Commitment.equals(noteCommitment)) {
        return noteV1;
      }
    }
  });

  return notes;
}

import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { Grumpkin } from '../ecc/grumpkin';
import { GrumpkinAddress } from '../address';
import { numToUInt8, numToUInt32BE } from '../serialize';
import { AssetId } from '../asset';
import { ViewingKey } from '../viewing_key';

export class Note {
  constructor(
    public ownerPubKey: GrumpkinAddress,
    public value: bigint,
    public assetId: AssetId,
    public nonce: number,
    public noteSecret: Buffer,
  ) {}

  static createFromEphPub(
    ownerPubKey: GrumpkinAddress,
    value: bigint,
    assetId: AssetId,
    nonce: number,
    ephPubKey: GrumpkinAddress,
    ownerPrivKey: Buffer,
    grumpkin: Grumpkin,
  ) {
    const noteSecret = deriveNoteSecret(ephPubKey, ownerPrivKey, grumpkin);
    return new Note(ownerPubKey, value, assetId, nonce, noteSecret);
  }

  static createFromEphPriv(
    ownerPubKey: GrumpkinAddress,
    value: bigint,
    assetId: AssetId,
    nonce: number,
    ephPrivKey: Buffer,
    grumpkin: Grumpkin,
  ) {
    const noteSecret = deriveNoteSecret(ownerPubKey, ephPrivKey, grumpkin);
    return new Note(ownerPubKey, value, assetId, nonce, noteSecret);
  }

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      numToUInt32BE(this.assetId),
      numToUInt32BE(this.nonce),
      this.ownerPubKey.toBuffer(),
      this.noteSecret,
    ]);
  }
}

export function createEphemeralPrivKey() {
  const key = randomBytes(32);
  key[0] &= 0x03; // TODO PROPERLY REDUCE THIS MOD P
  return key;
}

function deriveNoteSecret(ecdhPubKey: GrumpkinAddress, ecdhPrivKey: Buffer, grumpkin: Grumpkin) {
  const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
  const secretBuffer = Buffer.concat([sharedSecret, numToUInt8(0)]);
  const hash = createHash('sha256').update(secretBuffer).digest();
  hash[0] &= 0x03; // TODO PROPERLY REDUCE THIS MOD P
  return hash;
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
export function encryptNote(note: Note, ephPrivKey: Buffer, grumpkin: Grumpkin) {
  const ephPubKey = grumpkin.mul(Grumpkin.one, ephPrivKey);
  const aesSecret = deriveAESSecret(note.ownerPubKey, ephPrivKey, grumpkin);
  const aesKey = aesSecret.slice(0, 16);
  const iv = aesSecret.slice(16, 32);
  const cipher = createCipheriv('aes-128-cbc', aesKey, iv);

  const noteBuf = Buffer.concat([toBufferBE(note.value, 32), numToUInt32BE(note.assetId), numToUInt32BE(note.nonce)]);
  const plaintext = Buffer.concat([iv.slice(0, 8), noteBuf]);
  return new ViewingKey(Buffer.concat([cipher.update(plaintext), cipher.final(), ephPubKey]));
}

export function decryptNote(viewingKey: ViewingKey, privateKey: Buffer, grumpkin: Grumpkin) {
  const encryptedNote = viewingKey.toBuffer();
  const ephPubKey = new GrumpkinAddress(encryptedNote.slice(-64));
  const aesSecret = deriveAESSecret(ephPubKey, privateKey, grumpkin);
  const aesKey = aesSecret.slice(0, 16);
  const iv = aesSecret.slice(16, 32);

  try {
    const decipher = createDecipheriv('aes-128-cbc', aesKey, iv);
    const plaintext = Buffer.concat([decipher.update(encryptedNote.slice(0, -64)), decipher.final()]);

    const noteBuf = plaintext.slice(8);
    const ownerPubKey = grumpkin.mul(Grumpkin.one, privateKey);
    const note = Note.createFromEphPub(
      new GrumpkinAddress(ownerPubKey),
      toBigIntBE(noteBuf.slice(0, 32)),
      noteBuf.readUInt32BE(32),
      noteBuf.readUInt32BE(36),
      ephPubKey,
      privateKey,
      grumpkin,
    );

    const testIvSlice = plaintext.slice(0, 8);
    return testIvSlice.equals(iv.slice(0, 8)) ? note : undefined;
  } catch (err) {
    return;
  }
}

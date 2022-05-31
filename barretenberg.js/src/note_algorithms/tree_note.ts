import { GrumpkinAddress } from '../address';
import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { Grumpkin } from '../ecc/grumpkin';
import { numToUInt32BE } from '../serialize';
import { ViewingKey } from '../viewing_key';
import { DecryptedNote } from './decrypted_note';
import { deriveNoteSecret } from './derive_note_secret';

export class TreeNote {
  static EMPTY = new TreeNote(
    GrumpkinAddress.one(),
    BigInt(0),
    0,
    false,
    Buffer.alloc(32),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );
  static SIZE = TreeNote.EMPTY.toBuffer().length;

  constructor(
    public ownerPubKey: GrumpkinAddress,
    public value: bigint,
    public assetId: number,
    public accountRequired: boolean,
    public noteSecret: Buffer,
    public creatorPubKey: Buffer,
    public inputNullifier: Buffer,
  ) {}

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      numToUInt32BE(this.assetId),
      Buffer.from([this.accountRequired ? 1 : 0]),
      this.ownerPubKey.toBuffer(),
      this.noteSecret,
      this.creatorPubKey,
      this.inputNullifier,
    ]);
  }

  createViewingKey(ephPrivKey: Buffer, grumpkin: Grumpkin) {
    const noteBuf = Buffer.concat([
      toBufferBE(this.value, 32),
      numToUInt32BE(this.assetId),
      numToUInt32BE(+this.accountRequired),
      this.creatorPubKey,
    ]);
    return ViewingKey.createFromEphPriv(noteBuf, this.ownerPubKey, ephPrivKey, grumpkin);
  }

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const value = toBigIntBE(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const assetId = buf.readUInt32BE(dataStart);
    dataStart += 4;
    const accountRequired = !!buf[dataStart];
    dataStart += 1;
    const ownerPubKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const noteSecret = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const creatorPubKey = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const inputNullifier = buf.slice(dataStart, dataStart + 32);
    return new TreeNote(ownerPubKey, value, assetId, accountRequired, noteSecret, creatorPubKey, inputNullifier);
  }

  /**
   * Note on how the noteSecret can be derived in two different ways (from ephPubKey or ephPrivKey):
   *
   * ownerPubKey := [ownerPrivKey] * G  (where G is a generator of the grumpkin curve, and `[scalar] * Point` is scalar multiplication).
   *                      ↑
   *         a.k.a. account private key
   *
   * ephPubKey := [ephPrivKey] * G    (where ephPrivKey is a random field element).
   *
   * sharedSecret := [ephPrivKey] * ownerPubKey = [ephPrivKey] * ([ownerPrivKey] * G) = [ownerPrivKey] * ([ephPrivKey] * G) = [ownerPrivKey] * ephPubKey
   *                  ^^^^^^^^^^                                                                                                               ^^^^^^^^^
   * noteSecret is then derivable from the sharedSecret.
   */
  static createFromEphPriv(
    ownerPubKey: GrumpkinAddress,
    value: bigint,
    assetId: number,
    accountRequired: boolean,
    inputNullifier: Buffer,
    ephPrivKey: Buffer,
    grumpkin: Grumpkin,
    creatorPubKey: Buffer = Buffer.alloc(32),
  ) {
    const noteSecret = deriveNoteSecret(ownerPubKey, ephPrivKey, grumpkin);
    return new TreeNote(ownerPubKey, value, assetId, accountRequired, noteSecret, creatorPubKey, inputNullifier);
  }

  static createFromEphPub(
    ownerPubKey: GrumpkinAddress,
    value: bigint,
    assetId: number,
    accountRequired: boolean,
    inputNullifier: Buffer,
    ephPubKey: GrumpkinAddress,
    ownerPrivKey: Buffer,
    grumpkin: Grumpkin,
    creatorPubKey: Buffer = Buffer.alloc(32),
  ) {
    const noteSecret = deriveNoteSecret(ephPubKey, ownerPrivKey, grumpkin);
    return new TreeNote(ownerPubKey, value, assetId, accountRequired, noteSecret, creatorPubKey, inputNullifier);
  }

  static recover({ noteBuf, noteSecret }: DecryptedNote, inputNullifier: Buffer, ownerPubKey: GrumpkinAddress) {
    const value = toBigIntBE(noteBuf.slice(0, 32));
    const assetId = noteBuf.readUInt32BE(32);
    const accountRequired = !!noteBuf.readUInt32BE(36);
    const creatorPubKey = noteBuf.slice(40, 72);
    return new TreeNote(ownerPubKey, value, assetId, accountRequired, noteSecret, creatorPubKey, inputNullifier);
  }
}

import { Grumpkin } from '../ecc/grumpkin';
import { TreeNote, encryptNote, decryptNote } from './note';
import { randomBytes } from 'crypto';
import { BarretenbergWasm } from '../wasm';
import { GrumpkinAddress } from '../address';

describe('note', () => {
  it('should correctly encrypt and decrypt note', async () => {
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);

    const receiverPrivKey = randomBytes(32);
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));

    const ephPrivKey = randomBytes(32);
    const ephPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, ephPrivKey));
    const note = TreeNote.createFromEphPriv(receiverPubKey, BigInt(100), 0, 1, ephPrivKey, grumpkin);
    const encryptedNote = encryptNote(note, ephPrivKey, grumpkin);

    const note2 = decryptNote(encryptedNote, receiverPrivKey, grumpkin)!;

    const note3 = TreeNote.createFromEphPub(receiverPubKey, BigInt(100), 0, 1, ephPubKey, receiverPrivKey, grumpkin);
    expect(note2).toEqual(note);
    expect(note).toEqual(note3);
  });

  it('should not decrypt note', async () => {
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);

    const receiverPrivKey = randomBytes(32);
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));

    const ephPrivKey = randomBytes(32);
    const note = TreeNote.createFromEphPriv(receiverPubKey, BigInt(100), 0, 1, ephPrivKey, grumpkin);
    const encryptedNote = encryptNote(note, ephPrivKey, grumpkin);

    const note2 = decryptNote(encryptedNote, randomBytes(32), grumpkin)!;

    expect(note2).toBeUndefined();
  });
});

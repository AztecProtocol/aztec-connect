import { Grumpkin } from '../ecc/grumpkin';
import { Note, encryptNote, decryptNote } from './note';
import { randomBytes } from 'crypto';
import { BarretenbergWasm } from '../wasm';

describe('note', () => {
  it('should correctly encrypt and decrypt note', async () => {
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);

    const receiverPrivKey = randomBytes(32);
    const receiverPubKey = grumpkin.mul(Grumpkin.one, receiverPrivKey);

    const secret = randomBytes(32);
    const note = new Note(receiverPubKey, secret, 100);
    const encryptedNote = encryptNote(note, grumpkin);

    const note2 = decryptNote(encryptedNote, receiverPrivKey, grumpkin)!;

    expect(note2).not.toBeUndefined();
    expect(note2.secret).toEqual(note.secret);
    expect(note2.ownerPubKey).toEqual(note.ownerPubKey);
    expect(note2.value).toEqual(note.value);
  });

  it('should not decrypt note', async () => {
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);

    const receiverPrivKey = randomBytes(32);
    const receiverPubKey = grumpkin.mul(Grumpkin.one, receiverPrivKey);

    const secret = randomBytes(32);
    const note = new Note(receiverPubKey, secret, 100);
    const encryptedNote = encryptNote(note, grumpkin);

    const note2 = decryptNote(encryptedNote, randomBytes(32), grumpkin)!;

    expect(note2).toBeUndefined();
  });
});

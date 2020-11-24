import { Grumpkin } from '../ecc/grumpkin';
import { Note, encryptNote, decryptNote } from './note';
import { randomBytes } from 'crypto';
import { BarretenbergWasm } from '../wasm';
import { GrumpkinAddress } from '../address';

describe('note', () => {
  it('should correctly encrypt and decrypt note', async () => {
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);

    const receiverPrivKey = randomBytes(32);
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));

    const secret = randomBytes(32);
    const note = new Note(receiverPubKey, secret, BigInt(100), 0, 1);
    const encryptedNote = encryptNote(note, grumpkin);

    const note2 = decryptNote(encryptedNote, receiverPrivKey, grumpkin)!;

    expect(note2).toEqual(note);
  });

  it('should not decrypt note', async () => {
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);

    const receiverPrivKey = randomBytes(32);
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));

    const secret = randomBytes(32);
    const note = new Note(receiverPubKey, secret, BigInt(100), 0, 1);
    const encryptedNote = encryptNote(note, grumpkin);

    const note2 = decryptNote(encryptedNote, randomBytes(32), grumpkin)!;

    expect(note2).toBeUndefined();
  });
});

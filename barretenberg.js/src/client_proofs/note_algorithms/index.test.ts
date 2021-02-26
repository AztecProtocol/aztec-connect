import { BarretenbergWasm } from '../../wasm';
import { Grumpkin } from '../../ecc/grumpkin';
import { GrumpkinAddress } from '../../address';
import { NoteAlgorithms } from '.';
import { TreeNote, encryptNote } from '../note';
import { randomBytes } from 'crypto';
import { ViewingKey } from '../../viewing_key';
// import createDebug from 'debug';

// const debug = createDebug('bb:decrypt_test');

describe('compute_nullifier', () => {
  let barretenberg!: BarretenbergWasm;
  let grumpkin!: Grumpkin;

  const privateKey = Buffer.from('0b9b3adee6b3d81b28a0886b2a8415c7da31291a5e96bb7a56639e177d301beb', 'hex');
  const noteSecret = Buffer.from('0000000011111111000000001111111100000000111111110000000011111111', 'hex');

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
  });

  it('should compute correct nullifier', async () => {
    const noteAlgos = new NoteAlgorithms(barretenberg);

    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    const inputNote1 = new TreeNote(pubKey, BigInt(100), 0, 0, noteSecret);
    const inputNote2 = new TreeNote(pubKey, BigInt(50), 0, 0, noteSecret);
    inputNote1.noteSecret = noteSecret;
    inputNote2.noteSecret = noteSecret;

    const inputNote1Enc = noteAlgos.encryptNote(inputNote1);
    const inputNote2Enc = noteAlgos.encryptNote(inputNote2);

    const nullifier1 = noteAlgos.computeNoteNullifier(inputNote1Enc, 1, privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(inputNote2Enc, 0, privateKey);

    const expected1 = Buffer.from('056d84d285fc3c0f02d2b3fe61ec526d92601f25ce03a13915c87f27d803ba63', 'hex');
    const expected2 = Buffer.from('2756b99eed35e5da1a0e7769b162f69a56d4e22f98446c47f1cd89fb429b32a4', 'hex');

    expect(nullifier1).toEqual(expected1);
    expect(nullifier2).toEqual(expected2);
  });

  it('should correctly batch decrypt notes', async () => {
    const noteAlgos = new NoteAlgorithms(barretenberg);
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);

    const receiverPrivKey = randomBytes(32);
    receiverPrivKey[0] &= 0x03; // TODO PROPERLY REDUCE THIS MOD P
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = new Array(numNotes);
    const notes: TreeNote[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = randomBytes(32);
      ephPrivKey[0] &= 0x03; // TODO PROPERLY REDUCE THIS MOD P

      notes.push(TreeNote.createFromEphPriv(receiverPubKey, BigInt(100 + i), 0, 1, ephPrivKey, grumpkin));
      encryptedNotes[i] = encryptNote(notes[i], ephPrivKey, grumpkin);
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await noteAlgos.batchDecryptNotes(keyBuf, receiverPrivKey, grumpkin);

    expect(decryptedNotes.length).toEqual(numNotes);
    for (let i = 0; i < numNotes; ++i) {
      expect(decryptedNotes[i]!.value).toEqual(notes[i].value);
      expect(decryptedNotes[i]!.assetId).toEqual(notes[i].assetId);
      expect(decryptedNotes[i]!.nonce).toEqual(notes[i].nonce);
    }
  });

  it('should correctly batch decrypt notes and identify unowned notes', async () => {
    const noteAlgos = new NoteAlgorithms(barretenberg);
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);

    const receiverPrivKey = randomBytes(32);
    receiverPrivKey[0] &= 0x03; // TODO PROPERLY REDUCE THIS MOD P
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));
    const fakePrivKey = randomBytes(32);
    fakePrivKey[0] &= 0x03; // TODO PROPERLY REDUCE THIS MOD P
    const fakePubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, fakePrivKey));

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = new Array(numNotes);
    const notes: TreeNote[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = randomBytes(32);
      ephPrivKey[0] &= 0x03; // TODO PROPERLY REDUCE THIS MOD P
      if (i % 2 == 0) {
        notes.push(TreeNote.createFromEphPriv(receiverPubKey, BigInt(100), 0, 1, ephPrivKey, grumpkin));
        encryptedNotes[i] = encryptNote(notes[i / 2], ephPrivKey, grumpkin);
      } else {
        const note = TreeNote.createFromEphPriv(fakePubKey, BigInt(200), 0, 1, ephPrivKey, grumpkin);
        notes.push(note);
        encryptedNotes[i] = encryptNote(note, ephPrivKey, grumpkin);
      }
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await noteAlgos.batchDecryptNotes(keyBuf, receiverPrivKey, grumpkin);

    expect(decryptedNotes.length).toEqual(numNotes);
    for (let i = 0; i < decryptedNotes.length; ++i) {
      const note = decryptedNotes[i];
      if (!note) {
        continue;
      }
      expect(note.value).toEqual(notes[i].value);
      expect(note.assetId).toEqual(notes[i].assetId);
      expect(note.nonce).toEqual(notes[i].nonce);
    }
  });
});

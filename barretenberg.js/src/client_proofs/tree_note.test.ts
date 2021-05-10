import { Grumpkin } from '../ecc/grumpkin';
import { TreeNote, encryptNote, decryptNote, batchDecryptNotes } from './tree_note';
import { deriveNoteSecret } from './derive_note_secret';
import { randomBytes } from 'crypto';
import { BarretenbergWasm } from '../wasm';
import { GrumpkinAddress } from '../address';
import { NoteAlgorithms } from './note_algorithms';
import { ViewingKey } from '../viewing_key';

describe('tree_note', () => {
  let wasm: BarretenbergWasm;
  let grumpkin: Grumpkin;
  let noteAlgos!: NoteAlgorithms;

  beforeAll(async () => {
    wasm = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(wasm);
    noteAlgos = new NoteAlgorithms(wasm);
  });

  it('should correctly encrypt and decrypt note using old secret derivation method', async () => {
    const receiverPrivKey = randomBytes(32);
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));

    const ephPrivKey = randomBytes(32);
    const ephPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, ephPrivKey));
    const note = TreeNote.createFromEphPriv(receiverPubKey, BigInt(100), 0, 1, ephPrivKey, grumpkin);
    note.noteSecret = deriveNoteSecret(receiverPubKey, ephPrivKey, grumpkin, 0);
    const encryptedNote = encryptNote(note, ephPrivKey, grumpkin);

    const note2 = decryptNote(encryptedNote, receiverPrivKey, grumpkin, 0)!;

    const note3 = TreeNote.createFromEphPub(receiverPubKey, BigInt(100), 0, 1, ephPubKey, receiverPrivKey, grumpkin, 0);
    expect(note2).toEqual(note);
    expect(note).toEqual(note3);
  });

  it('should correctly encrypt and decrypt note using new secret derivation method', async () => {
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

    const note2 = decryptNote(encryptedNote, randomBytes(32), grumpkin, 0)!;

    expect(note2).toBeUndefined();
  });

  it('should correctly batch decrypt notes', async () => {
    const receiverPrivKey = grumpkin.getRandomFr();
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = new Array(numNotes);
    const notes: TreeNote[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      notes.push(TreeNote.createFromEphPriv(receiverPubKey, BigInt(100 + i), 0, 1, ephPrivKey, grumpkin));
      encryptedNotes[i] = encryptNote(notes[i], ephPrivKey, grumpkin);
    }

    const noteCommitments = notes.map(n => noteAlgos.encryptNote(n.toBuffer()));
    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiverPrivKey, grumpkin, noteCommitments, noteAlgos);
    expect(decryptedNotes.length).toEqual(numNotes);
    for (let i = 0; i < numNotes; ++i) {
      expect(decryptedNotes[i]!.value).toEqual(notes[i].value);
      expect(decryptedNotes[i]!.assetId).toEqual(notes[i].assetId);
      expect(decryptedNotes[i]!.nonce).toEqual(notes[i].nonce);
    }
  });

  it('should correctly batch decrypt notes and identify unowned notes', async () => {
    const receiverPrivKey = grumpkin.getRandomFr();
    const receiverPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, receiverPrivKey));
    const fakePrivKey = grumpkin.getRandomFr();
    const fakePubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, fakePrivKey));

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = [];
    const notes: TreeNote[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      if (i % 2 == 0) {
        const note = TreeNote.createFromEphPriv(receiverPubKey, BigInt(100), 0, 1, ephPrivKey, grumpkin, i % 4 ? 0 : 1);
        notes.push(note);
        encryptedNotes.push(encryptNote(note, ephPrivKey, grumpkin));
      } else {
        const note = TreeNote.createFromEphPriv(fakePubKey, BigInt(200), 0, 1, ephPrivKey, grumpkin);
        notes.push(note);
        encryptedNotes.push(encryptNote(note, ephPrivKey, grumpkin));
      }
    }

    const noteCommitments = notes.map(n => noteAlgos.encryptNote(n.toBuffer()));
    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiverPrivKey, grumpkin, noteCommitments, noteAlgos);

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

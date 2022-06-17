import { randomBytes } from 'crypto';
import { GrumpkinAddress } from '../address';
import { Grumpkin } from '../ecc/grumpkin';
import { batchDecryptNotes, NoteAlgorithms, recoverTreeNotes, TreeNote } from '../note_algorithms';
import { ViewingKey } from '../viewing_key';
import { BarretenbergWasm } from '../wasm';
import { numToUInt32BE } from '../serialize';
import { SingleNoteDecryptor } from './note_decryptor';

describe('tree_note', () => {
  let grumpkin: Grumpkin;
  let noteAlgos!: NoteAlgorithms;
  let noteDecryptor!: SingleNoteDecryptor;

  const createKeyPair = () => {
    const privKey = grumpkin.getRandomFr();
    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privKey));
    return { privKey, pubKey };
  };

  beforeAll(async () => {
    const wasm = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(wasm);
    noteAlgos = new NoteAlgorithms(wasm);
    noteDecryptor = new SingleNoteDecryptor(wasm);
  });

  it('should convert to and from buffer', () => {
    const note = new TreeNote(
      GrumpkinAddress.random(),
      BigInt(123),
      456,
      true,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
    );
    expect(TreeNote.fromBuffer(note.toBuffer())).toEqual(note);
  });

  it('should correctly batch decrypt notes', async () => {
    const receiver = createKeyPair();

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = [];
    const inputNullifiers: Buffer[] = [];
    const notes: TreeNote[] = [];
    const noteCommitments: Buffer[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      const inputNullifier = numToUInt32BE(i, 32);
      inputNullifiers.push(inputNullifier);
      const note = TreeNote.createFromEphPriv(
        receiver.pubKey,
        BigInt(100 + i),
        0,
        i % 2 > 0,
        inputNullifier,
        ephPrivKey,
        grumpkin,
      );
      notes.push(note);
      encryptedNotes.push(note.createViewingKey(ephPrivKey, grumpkin));
      noteCommitments.push(noteAlgos.valueNoteCommitment(note));
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteDecryptor, grumpkin);
    const recovered = recoverTreeNotes(
      decryptedNotes,
      inputNullifiers,
      noteCommitments,
      receiver.privKey,
      grumpkin,
      noteAlgos,
    );
    for (let i = 0; i < numNotes; ++i) {
      expect(recovered[i]).toEqual(notes[i]);
    }
  });

  it('should correctly batch decrypt notes and identify unowned notes', async () => {
    const receiver = createKeyPair();
    const stranger = createKeyPair();

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = [];
    const inputNullifiers: Buffer[] = [];
    const notes: TreeNote[] = [];
    const noteCommitments: Buffer[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const owner = i % 2 ? stranger : receiver;
      const ephPrivKey = grumpkin.getRandomFr();
      const inputNullifier = numToUInt32BE(i, 32);
      inputNullifiers.push(inputNullifier);
      const note = TreeNote.createFromEphPriv(
        owner.pubKey,
        BigInt(200),
        0,
        i % 2 > 0,
        inputNullifier,
        ephPrivKey,
        grumpkin,
      );
      notes.push(note);
      encryptedNotes.push(note.createViewingKey(ephPrivKey, grumpkin));
      noteCommitments.push(noteAlgos.valueNoteCommitment(note));
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteDecryptor, grumpkin);
    const recovered = recoverTreeNotes(
      decryptedNotes,
      inputNullifiers,
      noteCommitments,
      receiver.privKey,
      grumpkin,
      noteAlgos,
    );
    for (let i = 0; i < numNotes; ++i) {
      const note = recovered[i];
      if (i % 2) {
        expect(note).toBe(undefined);
      } else {
        expect(note).toEqual(notes[i]);
      }
    }
  });

  it('should correctly encrypt and decrypt note using new secret derivation method', async () => {
    const receiver = createKeyPair();

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = [];
    const inputNullifiers: Buffer[] = [];
    const notes: TreeNote[] = [];
    const noteCommitments: Buffer[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      const inputNullifier = numToUInt32BE(i, 32);
      inputNullifiers.push(inputNullifier);
      const note = TreeNote.createFromEphPriv(
        receiver.pubKey,
        BigInt(200),
        0,
        i % 2 > 0,
        inputNullifier,
        ephPrivKey,
        grumpkin,
      );
      notes.push(note);
      encryptedNotes.push(note.createViewingKey(ephPrivKey, grumpkin));
      noteCommitments.push(noteAlgos.valueNoteCommitment(note));
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteDecryptor, grumpkin);
    const recovered = recoverTreeNotes(
      decryptedNotes,
      inputNullifiers,
      noteCommitments,
      receiver.privKey,
      grumpkin,
      noteAlgos,
    );
    for (let i = 0; i < numNotes; ++i) {
      expect(recovered[i]).toEqual(notes[i]);
    }
  });

  it('should not decrypt notes with a wrong private key', async () => {
    const receiver = createKeyPair();

    const numNotes = 4;
    const encryptedNotes: ViewingKey[] = [];
    const inputNullifiers: Buffer[] = [];
    const notes: TreeNote[] = [];
    const noteCommitments: Buffer[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      const inputNullifier = numToUInt32BE(i, 32);
      inputNullifiers.push(inputNullifier);
      const note = TreeNote.createFromEphPriv(
        receiver.pubKey,
        BigInt(100 + i),
        0,
        i % 2 > 0,
        inputNullifier,
        ephPrivKey,
        grumpkin,
      );
      notes.push(note);
      encryptedNotes.push(note.createViewingKey(ephPrivKey, grumpkin));
      noteCommitments.push(noteAlgos.valueNoteCommitment(note));
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteDecryptor, grumpkin);
    const fakePrivKey = randomBytes(32);
    const recovered = recoverTreeNotes(
      decryptedNotes,
      inputNullifiers,
      noteCommitments,
      fakePrivKey,
      grumpkin,
      noteAlgos,
    );
    for (let i = 0; i < numNotes; ++i) {
      expect(recovered[i]).toBe(undefined);
    }
  });
});

import { randomBytes } from 'crypto';
import { GrumpkinAddress } from '../address';
import { Grumpkin } from '../ecc/grumpkin';
import { batchDecryptNotes, NoteAlgorithms, recoverTreeNotes, TreeNote } from '../note_algorithms';
import { ViewingKey } from '../viewing_key';
import { BarretenbergWasm } from '../wasm';

describe('tree_note', () => {
  let grumpkin: Grumpkin;
  let noteAlgos!: NoteAlgorithms;

  const createKeyPair = () => {
    const privKey = grumpkin.getRandomFr();
    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privKey));
    return { privKey, pubKey };
  };

  beforeAll(async () => {
    const wasm = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(wasm);
    noteAlgos = new NoteAlgorithms(wasm);
  });

  it('should correctly batch decrypt notes', async () => {
    const receiver = createKeyPair();

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = [];
    const notes: TreeNote[] = [];
    const noteCommitments: Buffer[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      const note = TreeNote.createFromEphPriv(receiver.pubKey, BigInt(100 + i), 0, 1, ephPrivKey, grumpkin);
      notes.push(note);
      encryptedNotes.push(note.getViewingKey(ephPrivKey, grumpkin));
      noteCommitments.push(noteAlgos.commitNote(note));
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteAlgos, grumpkin);
    const recovered = recoverTreeNotes(decryptedNotes, noteCommitments, receiver.privKey, grumpkin, noteAlgos);
    for (let i = 0; i < numNotes; ++i) {
      expect(recovered[i]).toEqual(notes[i]);
    }
  });

  it('should correctly batch decrypt notes and identify unowned notes', async () => {
    const receiver = createKeyPair();
    const stranger = createKeyPair();

    const numNotes = 8;
    const encryptedNotes: ViewingKey[] = [];
    const notes: TreeNote[] = [];
    const noteCommitments: Buffer[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const owner = i % 2 ? stranger : receiver;
      const ephPrivKey = grumpkin.getRandomFr();
      const note = TreeNote.createFromEphPriv(owner.pubKey, BigInt(200), 0, 1, ephPrivKey, grumpkin);
      notes.push(note);
      encryptedNotes.push(note.getViewingKey(ephPrivKey, grumpkin));
      noteCommitments.push(noteAlgos.commitNote(note));
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteAlgos, grumpkin);
    const recovered = recoverTreeNotes(decryptedNotes, noteCommitments, receiver.privKey, grumpkin, noteAlgos);
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
    const notes: TreeNote[] = [];
    const noteCommitments: Buffer[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const noteVersion = i % 4 ? 0 : 1;
      const ephPrivKey = grumpkin.getRandomFr();
      const note = TreeNote.createFromEphPriv(receiver.pubKey, BigInt(200), 0, 1, ephPrivKey, grumpkin, noteVersion);
      notes.push(note);
      encryptedNotes.push(note.getViewingKey(ephPrivKey, grumpkin));
      noteCommitments.push(noteAlgos.commitNote(note));
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteAlgos, grumpkin);
    const recovered = recoverTreeNotes(decryptedNotes, noteCommitments, receiver.privKey, grumpkin, noteAlgos);
    for (let i = 0; i < numNotes; ++i) {
      expect(recovered[i]).toEqual(notes[i]);
    }
  });

  it('should not decrypt notes with a wrong private key', async () => {
    const receiver = createKeyPair();

    const numNotes = 4;
    const encryptedNotes: ViewingKey[] = [];
    const notes: TreeNote[] = [];
    const noteCommitments: Buffer[] = [];
    for (let i = 0; i < numNotes; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      const note = TreeNote.createFromEphPriv(receiver.pubKey, BigInt(100 + i), 0, 1, ephPrivKey, grumpkin);
      notes.push(note);
      encryptedNotes.push(note.getViewingKey(ephPrivKey, grumpkin));
      noteCommitments.push(noteAlgos.commitNote(note));
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteAlgos, grumpkin);
    const fakePrivKey = randomBytes(32);
    const recovered = recoverTreeNotes(decryptedNotes, noteCommitments, fakePrivKey, grumpkin, noteAlgos);
    for (let i = 0; i < numNotes; ++i) {
      expect(recovered[i]).toBe(undefined);
    }
  });
});

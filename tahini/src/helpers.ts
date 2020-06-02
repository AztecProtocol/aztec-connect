import { encryptNote, Note } from 'barretenberg/client_proofs/note';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { randomBytes } from 'crypto';
import { utils } from 'ethers';

import { Note as NoteEntity } from './entity/note';

export function randomHex(hexLength: number): string {
  return utils.hexlify(utils.randomBytes(hexLength)).slice(2);
}

export function createNoteEntity(owner: string = randomHex(20)) {
  const noteToSave = new NoteEntity();
  noteToSave.note = Buffer.from(randomHex(50), 'hex');
  noteToSave.blockNum = 4;
  noteToSave.nullifier = false;
  noteToSave.owner = owner;
  return noteToSave;
}

export function createNote(grumpkin: any, receiverPrivKey: Buffer = randomBytes(32)) {
  const receiverPubKey = grumpkin.mul(Grumpkin.one, receiverPrivKey);
  const note = new Note(receiverPubKey, receiverPrivKey, 100);
  const encryptedNote = encryptNote(note, grumpkin); // encryptedNote = notedata
  return encryptedNote;
}

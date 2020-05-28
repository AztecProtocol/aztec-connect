import { Note, encryptNote } from 'barretenberg/client_proofs/note';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { randomBytes } from 'crypto';
import { utils } from 'ethers';
import * as encoding from 'text-encoding';


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

export function createNote(server: any, receiverPrivKey: Buffer = randomBytes(32)) {
  const receiverPubKey = server.grumpkin.mul(Grumpkin.one, receiverPrivKey);
  const secret = randomBytes(32);
  const note = new Note(receiverPubKey, secret, 100);
  const encryptedNote = encryptNote(note, server.grumpkin); // encryptedNote = notedata
  const informationKey = receiverPrivKey.toString('hex'); // informationKey = privateKey
  const id = receiverPubKey.toString('hex'); // id = publicKey

  const message = 'hello world';
  const signature = server.schnorr.constructSignature(new encoding.TextEncoder().encode(message), receiverPrivKey);

  return { note, id, informationKey, noteData: encryptedNote, message, signature };
}

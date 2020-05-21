import { utils } from 'ethers';
import { Note } from '../src/entity/Note';

export function randomHex(hexLength: number): string {
  return utils.hexlify(utils.randomBytes(hexLength)).slice(2);
}

export function createNoteEntity(owner: string = randomHex(20)) {
    const noteToSave = new Note();
    noteToSave.note = Buffer.from(randomHex(50), 'hex');
    noteToSave.blockNum = 4;
    noteToSave.nullifier = false;
    noteToSave.owner = owner
    return noteToSave;
}

import { Block } from 'barretenberg-es/block_source';
import { decryptNote, Note } from 'barretenberg-es/client_proofs/note';
import createDebug from 'debug';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';
import { NotePicker } from '../note_picker';
import { Database, DbNote } from '../database';
import { Grumpkin } from 'barretenberg-es/ecc/grumpkin';
import { User } from '../user';

const debug = createDebug('bb:user_state');

export class UserState {
  private notePicker = new NotePicker();

  constructor(private user: User, private grumpkin: Grumpkin, private blake2s: Blake2s, private db: Database) {}

  public async init() {
    const notes = await this.db.getUserNotes(this.user.id);
    const owner = await this.db.getUser(this.user.id);
    if (!owner) {
      throw new Error('User not found.');
    }
    this.notePicker.addNotes(
      notes.map(({ id: index, encrypted, viewingKey, value }) => {
        const encryptedBuf = Buffer.from(encrypted);
        const viewingKeyBuf = Buffer.from(viewingKey);
        const note = new Note(Buffer.from(owner.publicKey), viewingKeyBuf, value);
        const nullifier = this.computeNullifier(encryptedBuf, index, viewingKeyBuf);
        return { index, nullifier, note };
      })
    );
  }

  public async processBlock(block: Block) {
    let update = false;

    for (let i = 0; i < block.dataEntries.length; ++i) {
      const dataEntry = block.dataEntries[i];
      const encryptedNote = block.viewingKeys[i];
      const treeIndex = block.dataStartIndex + i;

      if (this.notePicker.hasNote(treeIndex)) {
        return;
      }

      const note = decryptNote(encryptedNote, this.user.privateKey, this.grumpkin);
      if (!note) {
        return;
      }
      debug(`succesfully decrypted note for user ${this.user.id} at index ${treeIndex}:`, note);

      const { secret, value } = note;
      const nullifier = this.computeNullifier(dataEntry, treeIndex, secret);

      await this.db.addNote(new DbNote(treeIndex, value, secret, encryptedNote, false, this.user.id));

      this.notePicker.addNote({ index: treeIndex, nullifier, note });
      update = true;
    }

    for (const nullifier of block.nullifiers) {
      const note = this.notePicker.findNote((note) => note.nullifier.equals(nullifier));
      if (note) {
        debug(`removing note ${note.index}`, note);
        this.notePicker.removeNote(note);
        this.db.nullifyNote(note.index);
        update = true;
      }
    }

    return update;
  }

  public pickNotes(value: number) {
    return this.notePicker.pick(value, 2) || this.notePicker.pick(value, 1);
  }

  // [256 bits of encrypted note x coord][32 least sig bits of index][223 bits of note viewing key][1 bit is_real]
  private computeNullifier(encryptedNote: Buffer, index: number, noteSecret: Buffer) {
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32BE(index, 0);
    const nullifier = Buffer.concat([encryptedNote.slice(0, 32), indexBuf, noteSecret.slice(4, 32)]);
    nullifier.writeUInt8(nullifier.readUInt8(63) | 1, 63);
    return this.blake2s.hashToField(nullifier).slice(16, 32);
  }

  public getBalance() {
    return this.notePicker.getNoteSum();
  }
}

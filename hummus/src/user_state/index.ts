import { JoinSplitProver } from 'barretenberg-es/client_proofs/join_split_proof';
import { WorldState } from 'barretenberg-es/world_state';
import { Block } from 'barretenberg-es/block_source';
import { Note } from 'barretenberg-es/client_proofs/note';
import createDebug from 'debug';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';
import { EventEmitter } from 'events';
import { NotePicker } from '../note_picker';
import { TrackedNote } from '../note_picker/note';
import { asyncMap } from '../utils/async';
import { db } from '../database';

const debug = createDebug('bb:user_state');

export interface User {
  id: number;
  privateKey: Buffer;
  publicKey: Buffer;
}

// prettier-ignore
const computeViewingKey = () => Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
  0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

export class UserState extends EventEmitter {
  private notePicker = new NotePicker();
  private users: User[] = [];

  constructor(
    private user: User,
    private joinSplitProver: JoinSplitProver,
    worldState: WorldState,
    private blake2s: Blake2s
  ) {
    super();
    worldState.on('block', (b: Block) => this.processBlock(b));
  }

  async init() {
    const allUsers = await db.user.toArray();
    // @ts-ignore
    this.users = await asyncMap(allUsers, (user) => user.toUser());
    if (!this.users.length) {
      return null;
    }

    this.user = this.users[0];
    await this.resetUserNotes();
    return this.user;
  }

  private async resetUserNotes() {
    const trackedNotes = await this.getUserNotes();
    this.notePicker.reset();
    this.notePicker.addNotes(trackedNotes);
    this.emit('updated');
  }

  private async getUserNotes() {
    const notes = await db.note.filter((n) => !n.nullified && n.owner === this.user.id).toArray();
    return await asyncMap(notes, async (note) => {
      // @ts-ignore
      return note.toTrackedNote(this.computeNullifier);
    });
  }

  private processBlock(block: Block) {
    let update = false;

    block.dataEntries.forEach((encryptedNote, i) => {
      const index = block.dataStartIndex + i;
      if (this.notePicker.hasNote(index)) return;

      const viewingKey = computeViewingKey();
      this.users.find((user) => {
        const { success, value } = this.joinSplitProver.decryptNote(encryptedNote, user.privateKey, viewingKey);
        if (success) {
          const note = new Note(user.publicKey, viewingKey, value);
          const nullifier = this.computeNullifier(encryptedNote, index, viewingKey);
          const trackedNote: TrackedNote = {
            index,
            nullifier,
            note,
          };
          debug(`succesfully decrypted note ${index}:`, trackedNote);
          const iNote = {
            id: index,
            value,
            viewingKey,
            encrypted: encryptedNote,
            nullified: false,
            owner: user.id,
          };
          db.note.put(iNote);
          if (user.id === this.user.id) {
            this.notePicker.addNote(trackedNote);
            update = true;
          }
        }
        return success;
      });
    });

    block.nullifiers.forEach((nullifier) => {
      const note = this.notePicker.findNote((note) => note.nullifier.equals(nullifier));
      if (note) {
        debug(`removing note ${note.index}`, note);
        this.notePicker.removeNote(note);
        db.note.update(note.index, { nullified: true });
        update = true;
      }
    });

    if (update) {
      this.emit('updated');
    }
  }

  public pickNotes(value: number) {
    return this.notePicker.pick(value, 2) || this.notePicker.pick(value, 1);
  }

  // [256 bits of encrypted note x coord][32 least sig bits of index][223 bits of note viewing key][1 bit is_real]
  private computeNullifier = (encryptedNote: Buffer, index: number, viewingKey: Buffer) => {
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32BE(index, 0);
    const nullifier = Buffer.concat([encryptedNote.slice(0, 32), indexBuf, viewingKey.slice(4, 32)]);
    nullifier.writeUInt8(nullifier.readUInt8(63) | 1, 63);
    return this.blake2s.hashToField(nullifier).slice(16, 32);
  };

  public getBalance() {
    return this.notePicker.getNoteSum();
  }

  public addUser(user: User) {
    this.users.push(user);
    // TODO - sync notes for new user
  }

  public getUserById(id: number) {
    return this.users.find((u) => u.id === id);
  }

  public getUsers() {
    return this.users;
  }

  public async switchUser(id: number) {
    const user = this.getUserById(id);
    if (!user) {
      return null;
    }

    this.user = user;
    await this.resetUserNotes();
    return user;
  }
}

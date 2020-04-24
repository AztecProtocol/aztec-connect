import { JoinSplitProver } from 'barretenberg-es/client_proofs/join_split_proof';
import { WorldState } from 'barretenberg-es/world_state';
import { Block } from 'barretenberg-es/block_source';
import { Note } from 'barretenberg-es/client_proofs/note';
import { NotePicker } from '../note_picker';
import createDebug from 'debug';
import { TrackedNote } from '../note_picker/note';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';

const debug = createDebug('bb:user_state');

export interface User {
  privateKey: Buffer;
  publicKey: Buffer;
}

// prettier-ignore
const computeViewingKey = () => Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
  0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

export class UserState {
  private notePicker = new NotePicker();

  constructor(
    private user: User,
    private joinSplitProver: JoinSplitProver,
    worldState: WorldState,
    private blake2s: Blake2s
  ) {
    worldState.on('block', (b: Block) => this.processBlock(b));
  }

  private processBlock(block: Block) {
    block.dataEntries.forEach((encryptedNote, i) => {
      const viewingKey = computeViewingKey();
      const { success, value } = this.joinSplitProver.decryptNote(encryptedNote, this.user.privateKey, viewingKey);
      if (success) {
        const note = new Note(this.user.publicKey, viewingKey, value);
        const index = block.dataStartIndex + i;
        const trackedNote: TrackedNote = {
          index,
          nullifier: this.computeNullifier(encryptedNote, index, viewingKey),
          note,
        };
        debug(`succesfully decrypted note ${index}:`, trackedNote);
        this.notePicker.addNote(trackedNote);
      }
    });

    block.nullifiers.forEach((nullifier) => {
      const note = this.notePicker.findNote((note) => note.nullifier.equals(nullifier));
      if (note) {
        debug(`removing note ${note.index}`);
        this.notePicker.removeNote(note);
      }
    });
  }

  public pickNotes(value: number) {
    return this.notePicker.pick(value, 2) || this.notePicker.pick(value, 1);
  }

  // [256 bits of encrypted note x coord][32 least sig bits of index][223 bits of note viewing key][1 bit is_real]
  private computeNullifier(encryptedNote: Buffer, index: number, viewingKey: Buffer) {
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32BE(index, 0);
    const nullifier = Buffer.concat([encryptedNote.slice(0, 32), indexBuf, viewingKey.slice(4, 32)]);
    nullifier.writeUInt8(nullifier.readUInt8(63) | 1, 63);
    return this.blake2s.hashToField(nullifier).slice(16, 32);
  }

}

import { Block } from 'barretenberg/block_source';
import { decryptNote, Note } from 'barretenberg/client_proofs/note';
import createDebug from 'debug';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { NotePicker } from '../note_picker';
import { DbNote, DbUserTx, Database } from '../database';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { User } from '../user';
import { computeNullifier } from 'barretenberg/client_proofs/join_split_proof/compute_nullifier';
import { UserTx } from '../user_tx';

const debug = createDebug('bb:user_state');

const dbUserTxToUserTx = (dbUserTx: DbUserTx): UserTx => ({
  ...dbUserTx,
  txHash: Buffer.from(dbUserTx.txHash),
  settled: !!dbUserTx.settled,
  recipient: Buffer.from(dbUserTx.recipient),
  outputNote1: dbUserTx.outputNote1 ? Buffer.from(dbUserTx.outputNote1) : undefined,
  outputNote2: dbUserTx.outputNote2 ? Buffer.from(dbUserTx.outputNote2) : undefined,
});

const dbNoteToTrackedNote = ({ id: index, viewingKey, value }: DbNote, owner: User) => ({
  index,
  note: new Note(owner.publicKey, Buffer.from(viewingKey), value),
});

export class UserState {
  private notePicker!: NotePicker;

  constructor(private user: User, private grumpkin: Grumpkin, private blake2s: Blake2s, private db: Database) {}

  public async init() {
    await this.refreshNotePicker();
  }

  public getUser() {
    return this.user;
  }

  public async processBlock(block: Block) {
    let updated = false;

    const userNotes = await this.db.getUserNotes(this.user.id);

    for (let i = 0; i < block.dataEntries.length; ++i) {
      const dataEntry = block.dataEntries[i];
      const encryptedNote = block.viewingKeys[i];
      const treeIndex = block.dataStartIndex + i;

      if (userNotes.find(n => n.id === treeIndex)) {
        updated = true;
        continue;
      }

      const note = decryptNote(encryptedNote, this.user.privateKey!, this.grumpkin);
      if (!note) {
        continue;
      }
      debug(`user ${this.user.id} successfully decrypted note at index ${treeIndex} with value ${note.value}.`);

      const { secret, value } = note;
      const nullifier = computeNullifier(dataEntry, treeIndex, secret, this.blake2s);
      const dbNote = new DbNote(
        treeIndex,
        value,
        new Uint8Array(dataEntry),
        new Uint8Array(secret),
        new Uint8Array(encryptedNote),
        new Uint8Array(nullifier),
        0,
        this.user.id,
      );
      await this.db.addNote(dbNote);
      await this.addReceivedTxIfNotOurs(dbNote);
      updated = true;
    }

    for (const nullifier of block.nullifiers) {
      const dbNote = await this.db.getNoteByNullifier(this.user.id, nullifier);
      if (!dbNote) {
        continue;
      }
      await this.db.nullifyNote(dbNote.id);
      debug(`user ${this.user.id} nullified note at index ${dbNote.id} with value ${dbNote.value}.`);
      await this.settleTxForNote(dbNote);
      updated = true;
    }

    await this.refreshNotePicker();

    return updated;
  }

  private async addReceivedTxIfNotOurs(dbNote: DbNote) {
    const dataEntry = Buffer.from(dbNote.dataEntry);
    const userTxs = await this.db.getUserTxs(this.user.id);
    let userTx = userTxs.find(tx => tx.outputNote1 && dataEntry.equals(Buffer.from(tx.outputNote1)));
    if (userTx) {
      await this.db.settleUserTx(userTx.txHash);
    } else if (!userTxs.find(tx => tx.outputNote2 && dataEntry.equals(Buffer.from(tx.outputNote2)))) {
      // No tx associated with this note. Add a new 'received' tx.
      const receivedTx: DbUserTx = {
        // TODO - find real txId or allow it to be empty in database.
        txHash: dataEntry.slice(0, 32),
        userId: this.user.id,
        action: 'RECEIVE',
        value: dbNote.value,
        recipient: this.user.publicKey,
        settled: 1,
        created: new Date(),
        outputNote1: dataEntry,
      };
      await this.db.addUserTx(receivedTx);
    }
  }

  private async settleTxForNote(dbNote: DbNote) {
    const userTxs = await this.db.getUserTxs(this.user.id);
    let userTx = userTxs.find(tx => tx.inputNote1 === dbNote.id || tx.inputNote2 === dbNote.id);
    if (userTx && !userTx.settled) {
      await this.db.settleUserTx(userTx.txHash);
    }
  }

  public async refreshNotePicker() {
    const dbNotes = await this.db.getUserNotes(this.user.id);
    const notes = dbNotes.map(dbNote => dbNoteToTrackedNote(dbNote, this.user));
    this.notePicker = new NotePicker();
    this.notePicker.addNotes(notes);
  }

  public pickNotes(value: number) {
    return this.notePicker.pick(value);
  }

  public getBalance() {
    return this.notePicker.getNoteSum();
  }

  public async addUserTx(userTx: UserTx) {
    await this.db.addUserTx(
      new DbUserTx(
        new Uint8Array(userTx.txHash),
        userTx.userId,
        userTx.action,
        userTx.value,
        new Uint8Array(userTx.recipient),
        userTx.settled ? 1 : 0,
        userTx.created,
        userTx.inputNote1,
        userTx.inputNote2,
        userTx.outputNote1 ? new Uint8Array(userTx.outputNote1) : undefined,
        userTx.outputNote2 ? new Uint8Array(userTx.outputNote2) : undefined,
      ),
    );
  }

  public async removeUserTx(txHash: Buffer) {
    await this.db.deleteUserTx(txHash);
  }

  public async getUserTx(txHash: Buffer) {
    const tx = await this.db.getUserTx(new Uint8Array(txHash));
    return tx ? dbUserTxToUserTx(tx) : undefined;
  }

  public async getUserTxs() {
    return (await this.db.getUserTxs(this.user.id)).map(dbUserTxToUserTx);
  }
}

export class UserStateFactory {
  constructor(private grumpkin: Grumpkin, private blake2s: Blake2s, private db: Database) {}

  createUserState(user: User) {
    return new UserState(user, this.grumpkin, this.blake2s, this.db);
  }
}

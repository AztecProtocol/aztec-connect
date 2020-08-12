import { Block } from 'barretenberg/block_source';
import { computeNullifier } from 'barretenberg/client_proofs/join_split_proof/compute_nullifier';
import { decryptNote } from 'barretenberg/client_proofs/note';
import { RollupProofData, InnerProofData } from 'barretenberg/rollup_proof';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { toBigIntBE } from 'bigint-buffer';
import createDebug from 'debug';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { User } from '../user';
import { UserTx, UserTxAction } from '../user_tx';

const debug = createDebug('bb:user_state');

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

    const { rollupProofData, viewingKeysData } = block;
    const { dataStartIndex, innerProofData } = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);
    for (let i = 0; i < innerProofData.length; ++i) {
      const proof = innerProofData[i];
      const txId = proof.getTxId();
      const savedUserTx = await this.db.getUserTx(this.user.id, txId);
      if (savedUserTx && savedUserTx.settled) {
        continue;
      }

      const { newNote1, newNote2, nullifier1, nullifier2, viewingKeys } = proof;
      const noteStartIndex = dataStartIndex + i * 2;
      const newNote = await this.processNewNote(noteStartIndex, newNote1, viewingKeys[0]);
      const changeNote = await this.processNewNote(noteStartIndex + 1, newNote2, viewingKeys[1]);
      if (!newNote && !changeNote) {
        // Neither note was decrypted (change note should always belong to us).
        continue;
      }

      const destroyedNote1 = await this.nullifiyNote(nullifier1);
      const destroyedNote2 = await this.nullifiyNote(nullifier2);

      if (savedUserTx) {
        await this.db.settleUserTx(txId);
      } else {
        const userTx = await this.recoverUserTx(proof, newNote, changeNote, destroyedNote1, destroyedNote2);
        await this.db.addUserTx(userTx);
      }

      updated = true;
    }

    if (updated) {
      await this.refreshNotePicker();
    }

    return updated;
  }

  private async processNewNote(index: number, dataEntry: Buffer, viewingKey: Buffer) {
    const savedNote = await this.db.getNote(index);
    if (savedNote) {
      return savedNote.owner === this.user.id ? savedNote : undefined;
    }

    const decryptedNote = decryptNote(viewingKey, this.user.privateKey!, this.grumpkin);
    if (!decryptedNote) {
      return;
    }

    const { secret, value } = decryptedNote;
    const nullifier = computeNullifier(dataEntry, index, secret, this.blake2s);
    const note = {
      index,
      value,
      dataEntry,
      viewingKey: secret,
      encrypted: viewingKey,
      nullifier,
      nullified: false,
      owner: this.user.id,
    };
    if (value) {
      await this.db.addNote(note);
      debug(`user ${this.user.id} successfully decrypted note at index ${index} with value ${value}.`);
    }
    return note;
  }

  private async nullifiyNote(nullifier: Buffer) {
    const note = await this.db.getNoteByNullifier(this.user.id, nullifier);
    if (note) {
      await this.db.nullifyNote(note.index);
      debug(`user ${this.user.id} nullified note at index ${note.index} with value ${note.value}.`);
    }
    return note;
  }

  private recoverUserTx(
    proof: InnerProofData,
    newNote?: Note,
    changeNote?: Note,
    destroyedNote1?: Note,
    destroyedNote2?: Note,
  ) {
    const createTx = (action: UserTxAction, value: number, recipient?: Buffer) => ({
      txHash: proof.getTxId(),
      action,
      value,
      recipient,
      userId: this.user.id,
      settled: true,
      created: new Date(),
    });

    if (!changeNote) {
      return createTx('RECEIVE', newNote!.value, this.user.publicKey);
    }

    const publicInput = toBigIntBE(proof.publicInput);
    const publicOutput = toBigIntBE(proof.publicOutput);

    if (!publicInput && !publicOutput) {
      const value = destroyedNote1!.value + (destroyedNote2 ? destroyedNote2.value : 0) - changeNote.value;
      return createTx('TRANSFER', value, newNote ? this.user.publicKey : undefined);
    }

    if (publicInput === publicOutput) {
      return createTx('PUBLIC_TRANSFER', Number(publicInput), proof.outputOwner);
    }

    if (publicInput > publicOutput) {
      return createTx('DEPOSIT', Number(publicInput), this.user.publicKey);
    }

    return createTx('WITHDRAW', Number(publicOutput), proof.outputOwner);
  }

  private async refreshNotePicker() {
    const notes = await this.db.getUserNotes(this.user.id);
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
    await this.db.addUserTx(userTx);
  }

  public async removeUserTx(txHash: Buffer) {
    await this.db.deleteUserTx(txHash);
  }

  public async getUserTx(txHash: Buffer) {
    return this.db.getUserTx(this.user.id, txHash);
  }

  public async getUserTxs() {
    return this.db.getUserTxs(this.user.id);
  }
}

export class UserStateFactory {
  constructor(private grumpkin: Grumpkin, private blake2s: Blake2s, private db: Database) {}

  createUserState(user: User) {
    return new UserState(user, this.grumpkin, this.blake2s, this.db);
  }
}

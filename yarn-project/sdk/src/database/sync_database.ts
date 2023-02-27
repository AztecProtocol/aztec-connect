import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../core_tx/index.js';
import { Note } from '../note/index.js';
import { UserData } from '../user/index.js';
import { Alias, Database, SpendingKey, BulkUserStateUpdateData } from './database.js';
import { Mutex } from 'async-mutex';

export class SyncDatabase implements Database {
  private writeMutex = new Mutex();

  constructor(private underlying: Database) {}

  close(): Promise<void> {
    return this.synchronise(() => this.underlying.close());
  }

  clear(): Promise<void> {
    return this.synchronise(() => this.underlying.clear());
  }

  addNote(note: Note): Promise<void> {
    return this.synchronise(() => this.underlying.addNote(note));
  }

  getNote(commitment: Buffer): Promise<Note | undefined> {
    return this.synchronise(() => this.underlying.getNote(commitment));
  }

  getNoteByNullifier(nullifier: Buffer): Promise<Note | undefined> {
    return this.synchronise(() => this.underlying.getNoteByNullifier(nullifier));
  }

  nullifyNote(nullifier: Buffer): Promise<void> {
    return this.synchronise(() => this.underlying.nullifyNote(nullifier));
  }

  getNotes(userId: GrumpkinAddress): Promise<Note[]> {
    return this.synchronise(() => this.underlying.getNotes(userId));
  }

  getPendingNotes(userId: GrumpkinAddress): Promise<Note[]> {
    return this.synchronise(() => this.underlying.getPendingNotes(userId));
  }

  removeNote(nullifier: Buffer): Promise<void> {
    return this.synchronise(() => this.underlying.removeNote(nullifier));
  }

  getUser(accountPublicKey: GrumpkinAddress): Promise<UserData | undefined> {
    return this.synchronise(() => this.underlying.getUser(accountPublicKey));
  }

  getUsers(): Promise<UserData[]> {
    return this.synchronise(() => this.underlying.getUsers());
  }

  addUser(user: UserData): Promise<void> {
    return this.synchronise(() => this.underlying.addUser(user));
  }

  updateUser(user: UserData): Promise<void> {
    return this.synchronise(() => this.underlying.updateUser(user));
  }

  removeUser(accountPublicKey: GrumpkinAddress): Promise<void> {
    return this.synchronise(() => this.underlying.removeUser(accountPublicKey));
  }

  resetUsers(): Promise<void> {
    return this.synchronise(() => this.underlying.resetUsers());
  }

  upsertPaymentTx(tx: CorePaymentTx): Promise<void> {
    return this.synchronise(() => this.underlying.upsertPaymentTx(tx));
  }

  getPaymentTx(userId: GrumpkinAddress, txId: TxId): Promise<CorePaymentTx | undefined> {
    return this.synchronise(() => this.underlying.getPaymentTx(userId, txId));
  }

  getPaymentTxs(userId: GrumpkinAddress): Promise<CorePaymentTx[]> {
    return this.synchronise(() => this.underlying.getPaymentTxs(userId));
  }

  upsertAccountTx(tx: CoreAccountTx): Promise<void> {
    return this.synchronise(() => this.underlying.upsertAccountTx(tx));
  }

  getAccountTx(txId: TxId): Promise<CoreAccountTx | undefined> {
    return this.synchronise(() => this.underlying.getAccountTx(txId));
  }

  getAccountTxs(userId: GrumpkinAddress): Promise<CoreAccountTx[]> {
    return this.synchronise(() => this.underlying.getAccountTxs(userId));
  }

  upsertDefiTx(tx: CoreDefiTx): Promise<void> {
    return this.synchronise(() => this.underlying.upsertDefiTx(tx));
  }

  getUnclaimedDefiTxs(userId: GrumpkinAddress): Promise<CoreDefiTx[]> {
    return this.synchronise(() => this.underlying.getUnclaimedDefiTxs(userId));
  }

  getDefiTx(txId: TxId): Promise<CoreDefiTx | undefined> {
    return this.synchronise(() => this.underlying.getDefiTx(txId));
  }

  getDefiTxs(userId: GrumpkinAddress): Promise<CoreDefiTx[]> {
    return this.synchronise(() => this.underlying.getDefiTxs(userId));
  }

  getUserTxs(userId: GrumpkinAddress): Promise<CoreUserTx[]> {
    return this.synchronise(() => this.underlying.getUserTxs(userId));
  }

  isUserTxSettled(txId: TxId): Promise<boolean> {
    return this.synchronise(() => this.underlying.isUserTxSettled(txId));
  }

  getPendingUserTxs(userId: GrumpkinAddress): Promise<CoreUserTx[]> {
    return this.synchronise(() => this.underlying.getPendingUserTxs(userId));
  }

  removeUserTx(userId: GrumpkinAddress, txId: TxId): Promise<void> {
    return this.synchronise(() => this.underlying.removeUserTx(userId, txId));
  }

  addSpendingKey(spendingKey: SpendingKey): Promise<void> {
    return this.synchronise(() => this.underlying.addSpendingKey(spendingKey));
  }

  addSpendingKeys(spendingKeys: SpendingKey[]): Promise<void> {
    return this.synchronise(() => this.underlying.addSpendingKeys(spendingKeys));
  }

  getSpendingKey(userId: GrumpkinAddress, spendingKey: GrumpkinAddress): Promise<SpendingKey | undefined> {
    return this.synchronise(() => this.underlying.getSpendingKey(userId, spendingKey));
  }

  getSpendingKeys(userId: GrumpkinAddress): Promise<SpendingKey[]> {
    return this.synchronise(() => this.underlying.getSpendingKeys(userId));
  }

  removeSpendingKeys(userId: GrumpkinAddress): Promise<void> {
    return this.synchronise(() => this.underlying.removeSpendingKeys(userId));
  }

  addAlias(alias: Alias): Promise<void> {
    return this.synchronise(() => this.underlying.addAlias(alias));
  }

  addAliases(alias: Alias[]): Promise<void> {
    return this.synchronise(() => this.underlying.addAliases(alias));
  }

  getAlias(accountPublicKey: GrumpkinAddress): Promise<Alias | undefined> {
    return this.synchronise(() => this.underlying.getAlias(accountPublicKey));
  }

  getAliasByAliasHash(aliasHash: AliasHash): Promise<Alias | undefined> {
    return this.synchronise(() => this.underlying.getAliasByAliasHash(aliasHash));
  }

  addKey(name: string, value: Buffer): Promise<void> {
    return this.synchronise(() => this.underlying.addKey(name, value));
  }

  getKey(name: string): Promise<Buffer | undefined> {
    return this.synchronise(() => this.underlying.getKey(name));
  }

  deleteKey(name: string): Promise<void> {
    return this.synchronise(() => this.underlying.deleteKey(name));
  }

  acquireLock(name: string, timeout: number): Promise<boolean> {
    return this.synchronise(() => this.underlying.acquireLock(name, timeout));
  }

  extendLock(name: string, timeout: number): Promise<void> {
    return this.synchronise(() => this.underlying.extendLock(name, timeout));
  }

  releaseLock(name: string): Promise<void> {
    return this.synchronise(() => this.underlying.releaseLock(name));
  }

  bulkUserStateUpdate(data: BulkUserStateUpdateData): Promise<void> {
    return this.synchronise(() => this.underlying.bulkUserStateUpdate(data));
  }

  private async synchronise<T>(fn: () => Promise<T>) {
    const release = await this.writeMutex.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

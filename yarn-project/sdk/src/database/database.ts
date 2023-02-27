import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { MutexDatabase } from '@aztec/barretenberg/mutex';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../core_tx/index.js';
import { Note } from '../note/index.js';
import { UserData } from '../user/index.js';

export class SpendingKey {
  constructor(
    public userId: GrumpkinAddress,
    public key: Buffer, // only contains x coordinate of a grumpkin address.
    public treeIndex: number,
    public hashPath: Buffer,
  ) {
    if (key.length !== 32) {
      throw new Error('Invalid key buffer.');
    }
  }
}

export class Alias {
  constructor(
    public accountPublicKey: GrumpkinAddress,
    public aliasHash: AliasHash,
    public index: number,
    public noteCommitment1?: Buffer,
    public spendingPublicKeyX?: Buffer,
  ) {}
}

export class BulkUserStateUpdateData {
  constructor(
    public updateUserArgs: Parameters<Database['updateUser']>[] = [],
    public addSpendingKeyArgs: Parameters<Database['addSpendingKey']>[] = [],
    public upsertAccountTxArgs: Parameters<Database['upsertAccountTx']>[] = [],
    public upsertPaymentTxArgs: Parameters<Database['upsertPaymentTx']>[] = [],
    public upsertDefiTxArgs: Parameters<Database['upsertDefiTx']>[] = [],
    public addNoteArgs: Parameters<Database['addNote']>[] = [],
    public nullifyNoteArgs: Parameters<Database['nullifyNote']>[] = [],
  ) {}
}

export interface Database extends MutexDatabase {
  close(): Promise<void>;
  clear(): Promise<void>;

  addNote(note: Note): Promise<void>;
  getNote(commitment: Buffer): Promise<Note | undefined>;
  getNoteByNullifier(nullifier: Buffer): Promise<Note | undefined>;
  nullifyNote(nullifier: Buffer): Promise<void>;
  getNotes(userId: GrumpkinAddress): Promise<Note[]>;
  getPendingNotes(userId: GrumpkinAddress): Promise<Note[]>;
  removeNote(nullifier: Buffer): Promise<void>;

  getUser(accountPublicKey: GrumpkinAddress): Promise<UserData | undefined>;
  getUsers(): Promise<UserData[]>;
  addUser(user: UserData): Promise<void>;
  updateUser(user: UserData): Promise<void>;
  removeUser(accountPublicKey: GrumpkinAddress): Promise<void>;
  resetUsers(): Promise<void>;

  upsertPaymentTx(tx: CorePaymentTx): Promise<void>;
  getPaymentTx(userId: GrumpkinAddress, txId: TxId): Promise<CorePaymentTx | undefined>;
  getPaymentTxs(userId: GrumpkinAddress): Promise<CorePaymentTx[]>;

  upsertAccountTx(tx: CoreAccountTx): Promise<void>;
  getAccountTx(txId: TxId): Promise<CoreAccountTx | undefined>;
  getAccountTxs(userId: GrumpkinAddress): Promise<CoreAccountTx[]>;

  upsertDefiTx(tx: CoreDefiTx): Promise<void>;
  getUnclaimedDefiTxs(userId: GrumpkinAddress): Promise<CoreDefiTx[]>;
  getDefiTx(txId: TxId): Promise<CoreDefiTx | undefined>;
  getDefiTxs(userId: GrumpkinAddress): Promise<CoreDefiTx[]>;

  getUserTxs(userId: GrumpkinAddress): Promise<CoreUserTx[]>;
  isUserTxSettled(txId: TxId): Promise<boolean>;
  getPendingUserTxs(userId: GrumpkinAddress): Promise<CoreUserTx[]>;
  removeUserTx(userId: GrumpkinAddress, txId: TxId): Promise<void>;

  addSpendingKey(spendingKey: SpendingKey): Promise<void>;
  addSpendingKeys(spendingKeys: SpendingKey[]): Promise<void>;
  getSpendingKey(userId: GrumpkinAddress, spendingKey: GrumpkinAddress): Promise<SpendingKey | undefined>;
  getSpendingKeys(userId: GrumpkinAddress): Promise<SpendingKey[]>;
  removeSpendingKeys(userId: GrumpkinAddress): Promise<void>;

  addAlias(alias: Alias): Promise<void>;
  addAliases(alias: Alias[]): Promise<void>;
  getAlias(accountPublicKey: GrumpkinAddress): Promise<Alias | undefined>;
  getAliasByAliasHash(aliasHash: AliasHash): Promise<Alias | undefined>;

  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Buffer | undefined>;
  deleteKey(name: string): Promise<void>;

  bulkUserStateUpdate(data: BulkUserStateUpdateData): Promise<void>;
}

import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { MutexDatabase } from '@aztec/barretenberg/mutex';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../core_tx';
import { Note } from '../note';
import { UserData } from '../user';

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
  constructor(public accountPublicKey: GrumpkinAddress, public aliasHash: AliasHash, public index: number) {}
}

export interface Database extends MutexDatabase {
  init(): Promise<void>;
  close(): Promise<void>;
  clear(): Promise<void>;

  addNote(note: Note): Promise<void>;
  getNote(commitment: Buffer): Promise<Note | undefined>;
  getNoteByNullifier(nullifier: Buffer): Promise<Note | undefined>;
  nullifyNote(nullifier: Buffer): Promise<void>;
  getNotes(userId: GrumpkinAddress): Promise<Note[]>;
  getPendingNotes(userId: GrumpkinAddress): Promise<Note[]>;
  removeNote(nullifier: Buffer): Promise<void>;

  getUser(userId: GrumpkinAddress): Promise<UserData | undefined>;
  getUsers(): Promise<UserData[]>;
  addUser(user: UserData): Promise<void>;
  updateUser(user: UserData): Promise<void>;
  removeUser(userId: GrumpkinAddress): Promise<void>;
  resetUsers(): Promise<void>;

  addPaymentTx(tx: CorePaymentTx): Promise<void>;
  getPaymentTx(userId: GrumpkinAddress, txId: TxId): Promise<CorePaymentTx | undefined>;
  getPaymentTxs(userId: GrumpkinAddress): Promise<CorePaymentTx[]>;
  settlePaymentTx(userId: GrumpkinAddress, txId: TxId, settled: Date): Promise<void>;

  addAccountTx(tx: CoreAccountTx): Promise<void>;
  getAccountTx(txId: TxId): Promise<CoreAccountTx | undefined>;
  getAccountTxs(userId: GrumpkinAddress): Promise<CoreAccountTx[]>;
  settleAccountTx(txId: TxId, settled: Date): Promise<void>;

  addDefiTx(tx: CoreDefiTx): Promise<void>;
  getDefiTx(txId: TxId): Promise<CoreDefiTx | undefined>;
  getDefiTxs(userId: GrumpkinAddress): Promise<CoreDefiTx[]>;
  getDefiTxsByNonce(userId: GrumpkinAddress, interactionNonce: number): Promise<CoreDefiTx[]>;
  settleDefiDeposit(txId: TxId, interactionNonce: number, isAsync: boolean, settled: Date): Promise<void>;
  updateDefiTxFinalisationResult(
    txId: TxId,
    success: boolean,
    outputValueA: bigint,
    outputValueB: bigint,
    finalised: Date,
  ): Promise<void>;
  settleDefiTx(txId: TxId, claimSettled: Date, claimTxId: TxId): Promise<void>;

  addClaimTx(tx: CoreClaimTx): Promise<void>;
  getClaimTx(nullifier: Buffer): Promise<CoreClaimTx | undefined>;

  getUserTxs(userId: GrumpkinAddress): Promise<CoreUserTx[]>;
  isUserTxSettled(txId: TxId): Promise<boolean>;
  getPendingUserTxs(userId: GrumpkinAddress): Promise<TxId[]>;
  removeUserTx(userId: GrumpkinAddress, txId: TxId): Promise<void>;

  addSpendingKey(spendingKey: SpendingKey): Promise<void>;
  addSpendingKeys(spendingKeys: SpendingKey[]): Promise<void>;
  getSpendingKey(userId: GrumpkinAddress, spendingKey: GrumpkinAddress): Promise<SpendingKey | undefined>;
  getSpendingKeys(userId: GrumpkinAddress): Promise<SpendingKey[]>;
  removeSpendingKeys(userId: GrumpkinAddress): Promise<void>;

  addAlias(alias: Alias): Promise<void>;
  addAliases(alias: Alias[]): Promise<void>;
  getAlias(accountPublicKey: GrumpkinAddress): Promise<Alias | undefined>;
  getAliases(aliasHash: AliasHash): Promise<Alias[]>;

  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Buffer | undefined>;
}

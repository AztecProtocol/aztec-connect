import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { MutexDatabase } from '@aztec/barretenberg/mutex';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../core_tx/index.js';
import { Note } from '../note/index.js';

export class SpendingKey {
  constructor(
    public accountPublicKey: GrumpkinAddress,
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

export interface AccountData {
  accountPublicKey: GrumpkinAddress;
  syncedToRollup: number;
}

export interface Database extends MutexDatabase {
  close(): Promise<void>;
  clear(): Promise<void>;

  addNote(note: Note): Promise<void>;
  getNote(commitment: Buffer): Promise<Note | undefined>;
  getNoteByNullifier(nullifier: Buffer): Promise<Note | undefined>;
  nullifyNote(nullifier: Buffer): Promise<void>;
  getNotes(accountPublicKey: GrumpkinAddress): Promise<Note[]>;
  getPendingNotes(accountPublicKey: GrumpkinAddress): Promise<Note[]>;
  removeNote(nullifier: Buffer): Promise<void>;

  addAccount(account: AccountData): Promise<void>;
  getAccount(accountPublicKey: GrumpkinAddress): Promise<AccountData | undefined>;
  getAccounts(): Promise<AccountData[]>;
  removeAccount(accountPublicKey: GrumpkinAddress): Promise<void>;

  addPaymentTx(tx: CorePaymentTx): Promise<void>;
  getPaymentTx(accountPublicKey: GrumpkinAddress, txId: TxId): Promise<CorePaymentTx | undefined>;
  getPaymentTxs(accountPublicKey: GrumpkinAddress): Promise<CorePaymentTx[]>;

  addAccountTx(tx: CoreAccountTx): Promise<void>;
  getAccountTx(txId: TxId): Promise<CoreAccountTx | undefined>;
  getAccountTxs(accountPublicKey: GrumpkinAddress): Promise<CoreAccountTx[]>;

  addDefiTx(tx: CoreDefiTx): Promise<void>;
  getDefiTx(txId: TxId): Promise<CoreDefiTx | undefined>;
  getDefiTxs(accountPublicKey: GrumpkinAddress): Promise<CoreDefiTx[]>;
  getDefiTxsByNonce(accountPublicKey: GrumpkinAddress, interactionNonce: number): Promise<CoreDefiTx[]>;

  addClaimTx(tx: CoreClaimTx): Promise<void>;
  getClaimTx(nullifier: Buffer): Promise<CoreClaimTx | undefined>;

  getTxs(accountPublicKey: GrumpkinAddress): Promise<CoreUserTx[]>;
  isTxSettled(txId: TxId): Promise<boolean>;
  getPendingTxs(accountPublicKey: GrumpkinAddress): Promise<TxId[]>;
  removeTx(accountPublicKey: GrumpkinAddress, txId: TxId): Promise<void>;

  addSpendingKey(spendingKey: SpendingKey): Promise<void>;
  addSpendingKeys(spendingKeys: SpendingKey[]): Promise<void>;
  getSpendingKey(accountPublicKey: GrumpkinAddress, spendingKey: GrumpkinAddress): Promise<SpendingKey | undefined>;
  getSpendingKeys(accountPublicKey: GrumpkinAddress): Promise<SpendingKey[]>;
  removeSpendingKeys(accountPublicKey: GrumpkinAddress): Promise<void>;

  addAlias(alias: Alias): Promise<void>;
  addAliases(alias: Alias[]): Promise<void>;
  getAlias(accountPublicKey: GrumpkinAddress): Promise<Alias | undefined>;
  getAliases(aliasHash: AliasHash): Promise<Alias[]>;

  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Buffer | undefined>;
  deleteKey(name: string): Promise<void>;

  setGenesisData(data: Buffer): Promise<void>;
  getGenesisData(): Promise<Buffer>;
}

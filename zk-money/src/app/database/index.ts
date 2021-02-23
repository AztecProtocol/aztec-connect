import { AccountId, EthAddress, GrumpkinAddress, TxHash, UserJoinSplitTx } from '@aztec/sdk';
import Dexie from 'dexie';

export interface LinkedAccount {
  accountPublicKey: GrumpkinAddress;
  alias: string;
  timestamp: Date;
}

class DexieAccount {
  constructor(public accountPublicKey: Uint8Array, public alias: string, public timestamp: Date) {}
}

const toDexieAccount = ({ accountPublicKey, alias, timestamp }: LinkedAccount) =>
  new DexieAccount(new Uint8Array(accountPublicKey.toBuffer()), alias, timestamp);

const fromDexieAccount = ({ accountPublicKey, alias, timestamp }: DexieAccount): LinkedAccount => ({
  accountPublicKey: new GrumpkinAddress(Buffer.from(accountPublicKey)),
  alias,
  timestamp,
});

class DexieMigratingTx {
  constructor(
    public txHash: Uint8Array,
    public userId: Uint8Array,
    public assetId: number,
    public publicInput: string,
    public publicOutput: string,
    public privateInput: string,
    public recipientPrivateOutput: string,
    public senderPrivateOutput: string,
    public ownedByUser: boolean,
    public created: number,
    public proofSender: Uint8Array,
    public settled?: Date,
    public inputOwner?: Uint8Array,
    public outputOwner?: Uint8Array,
  ) {}
}

const toDexieMigratingTx = (proofSender: AccountId, tx: UserJoinSplitTx) =>
  new DexieMigratingTx(
    new Uint8Array(tx.txHash.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    tx.assetId,
    tx.publicInput.toString(),
    tx.publicOutput.toString(),
    tx.privateInput.toString(),
    tx.recipientPrivateOutput.toString(),
    tx.senderPrivateOutput.toString(),
    tx.ownedByUser,
    tx.created.getTime(),
    new Uint8Array(proofSender.toBuffer()),
    tx.settled,
    tx.inputOwner ? new Uint8Array(tx.inputOwner.toBuffer()) : undefined,
    tx.outputOwner ? new Uint8Array(tx.outputOwner.toBuffer()) : undefined,
  );

const fromDexieMigratingTx = ({
  txHash,
  userId,
  publicInput,
  publicOutput,
  privateInput,
  recipientPrivateOutput,
  senderPrivateOutput,
  created,
  inputOwner,
  outputOwner,
  proofSender, // eslint-disable-line @typescript-eslint/no-unused-vars
  ...rest
}: DexieMigratingTx): UserJoinSplitTx => ({
  ...rest,
  txHash: new TxHash(Buffer.from(txHash)),
  userId: AccountId.fromBuffer(Buffer.from(userId)),
  publicInput: BigInt(publicInput),
  publicOutput: BigInt(publicOutput),
  privateInput: BigInt(privateInput),
  recipientPrivateOutput: BigInt(recipientPrivateOutput),
  senderPrivateOutput: BigInt(senderPrivateOutput),
  created: new Date(created),
  inputOwner: inputOwner ? new EthAddress(Buffer.from(inputOwner)) : undefined,
  outputOwner: outputOwner ? new EthAddress(Buffer.from(outputOwner)) : undefined,
});

export class Database {
  private db!: Dexie;
  private account!: Dexie.Table<DexieAccount, Uint8Array>;
  private migratingTx!: Dexie.Table<DexieMigratingTx, Uint8Array>;

  constructor(private dbName = 'zk-money', private version = 1) {}

  get isOpen() {
    return this.db?.isOpen();
  }

  async open() {
    this.createTables();

    try {
      await this.getAccount(GrumpkinAddress.randomAddress());
    } catch (e) {
      await this.db.delete();
      this.createTables();
    }
  }

  private createTables() {
    this.db = new Dexie(this.dbName);
    this.db.version(this.version).stores({
      account: '&accountPublicKey',
      migratingTx: '&txHash, userId, proofSender',
    });

    this.account = this.db.table('account');
    this.account.mapToClass(DexieAccount);
    this.migratingTx = this.db.table('migratingTx');
    this.migratingTx.mapToClass(DexieMigratingTx);
  }

  async clear() {
    for (const table of this.db.tables) {
      await table.clear();
    }
  }

  async close() {
    await this.db?.close();
  }

  async addAccount(account: LinkedAccount) {
    await this.account.put(toDexieAccount(account));
  }

  async getAccount(accountPublicKey: GrumpkinAddress) {
    const account = await this.account.get({ accountPublicKey: new Uint8Array(accountPublicKey.toBuffer()) });
    return account ? fromDexieAccount(account) : undefined;
  }

  async getAccounts() {
    const accounts = await this.account.toArray();
    return accounts.map(fromDexieAccount);
  }

  async deleteAccount(accountPublicKey: GrumpkinAddress) {
    await this.account.delete(new Uint8Array(accountPublicKey.toBuffer()));
  }

  async addMigratingTx(proofSender: AccountId, tx: UserJoinSplitTx) {
    await this.migratingTx.put(toDexieMigratingTx(proofSender, tx));
  }

  async getMigratingTxs(userId: AccountId) {
    return (
      await this.migratingTx
        .where({ userId: new Uint8Array(userId.toBuffer()) })
        .reverse()
        .sortBy('created')
    ).map(fromDexieMigratingTx);
  }

  async removeMigratingTxs(proofSender: AccountId) {
    await this.migratingTx.where({ proofSender: new Uint8Array(proofSender.toBuffer()) }).delete();
  }
}

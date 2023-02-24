import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { Connection, ConnectionOptions, DataSource, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx } from '../../core_tx/index.js';
import { Note } from '../../note/index.js';
import { AccountData, Alias, Database, SpendingKey } from '../database.js';
import { AccountTxDao } from './account_tx_dao.js';
import { AliasDao } from './alias_dao.js';
import { ClaimTxDao } from './claim_tx_dao.js';
import { DefiTxDao } from './defi_tx_dao.js';
import { KeyDao } from './key_dao.js';
import { MutexDao } from './mutex_dao.js';
import { NoteDao, noteDaoToNote, noteToNoteDao } from './note_dao.js';
import { PaymentTxDao } from './payment_tx_dao.js';
import { SpendingKeyDao } from './spending_key_dao.js';
import { UserDataDao } from './user_data_dao.js';

function nullToUndefined<T>(input: T | null) {
  return input === null ? undefined : input;
}

export const getOrmConfig = (memoryDb = false, identifier?: string): ConnectionOptions => {
  const folder = identifier ? `/${identifier}` : '';
  const dbPath = `./data${folder}`;
  const suffix = identifier ? `-${identifier}` : '';
  return {
    name: `aztec2-sdk${suffix}`,
    type: 'sqlite',
    database: memoryDb ? ':memory:' : `${dbPath}/aztec2-sdk.sqlite`,
    entities: [
      AccountTxDao,
      AliasDao,
      ClaimTxDao,
      DefiTxDao,
      KeyDao,
      MutexDao,
      NoteDao,
      PaymentTxDao,
      UserDataDao,
      SpendingKeyDao,
    ],
    synchronize: true,
    logging: false,
  };
};

const toCorePaymentTx = (tx: PaymentTxDao) =>
  new CorePaymentTx(
    tx.txId,
    tx.accountPublicKey,
    tx.proofId,
    tx.assetId,
    tx.publicValue,
    tx.publicOwner,
    tx.privateInput,
    tx.recipientPrivateOutput,
    tx.senderPrivateOutput,
    tx.isRecipient,
    tx.isSender,
    tx.txRefNo,
    tx.created,
    tx.settled,
  );

const toCoreAccountTx = (tx: AccountTxDao) =>
  new CoreAccountTx(
    tx.txId,
    tx.accountPublicKey,
    tx.aliasHash,
    tx.newSpendingPublicKey1,
    tx.newSpendingPublicKey2,
    tx.migrated,
    tx.txRefNo,
    tx.created,
    tx.settled,
  );

const toCoreDefiTx = (tx: DefiTxDao) =>
  new CoreDefiTx(
    tx.txId,
    tx.accountPublicKey,
    tx.bridgeCallData,
    tx.depositValue,
    tx.txFee,
    tx.txRefNo,
    tx.created,
    tx.settled,
    tx.interactionNonce,
    tx.isAsync,
    tx.success,
    tx.outputValueA,
    tx.outputValueB,
    tx.finalised,
    tx.claimSettled,
    tx.claimTxId,
  );

const sortTxs = (txs: any[]) => {
  const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
  const settled = txs.filter(tx => tx.settled);
  return [...unsettled, ...settled];
};

export class SQLDatabase implements Database {
  private accountTxRep: Repository<AccountTxDao>;
  private aliasRep: Repository<AliasDao>;
  private claimTxRep: Repository<ClaimTxDao>;
  private defiTxRep: Repository<DefiTxDao>;
  private keyRep: Repository<KeyDao>;
  private noteRep: Repository<NoteDao>;
  private paymentTxRep: Repository<PaymentTxDao>;
  private userDataRep: Repository<UserDataDao>;
  private spendingKeyRep: Repository<SpendingKeyDao>;
  private mutex: Repository<MutexDao>;
  private readonly genesisDataKey = 'genesisData';

  constructor(private connection: Connection) {
    this.accountTxRep = this.connection.getRepository(AccountTxDao);
    this.aliasRep = this.connection.getRepository(AliasDao);
    this.claimTxRep = this.connection.getRepository(ClaimTxDao);
    this.defiTxRep = this.connection.getRepository(DefiTxDao);
    this.keyRep = this.connection.getRepository(KeyDao);
    this.noteRep = this.connection.getRepository(NoteDao);
    this.paymentTxRep = this.connection.getRepository(PaymentTxDao);
    this.userDataRep = this.connection.getRepository(UserDataDao);
    this.spendingKeyRep = this.connection.getRepository(SpendingKeyDao);
    this.mutex = this.connection.getRepository(MutexDao);
  }

  static async getDb(memoryDb = false, identifier?: string) {
    const config = getOrmConfig(memoryDb, identifier);
    const connection = new DataSource(config);
    await connection.initialize();
    return new SQLDatabase(connection);
  }

  async close() {
    await this.connection.close();
  }

  async clear() {
    await this.connection.synchronize(true);
  }

  async addNote(note: Note) {
    await this.noteRep.save(noteToNoteDao(note));
  }

  async getNote(commitment: Buffer) {
    const note = await this.noteRep.findOne({ where: { commitment } });
    return note ? noteDaoToNote(note) : undefined;
  }

  async getNoteByNullifier(nullifier: Buffer) {
    const note = await this.noteRep.findOne({ where: { nullifier } });
    return note ? noteDaoToNote(note) : undefined;
  }

  async nullifyNote(nullifier: Buffer) {
    await this.noteRep.update({ nullifier }, { nullified: true });
  }

  async getNotes(accountPublicKey: GrumpkinAddress) {
    return (await this.noteRep.find({ where: { owner: accountPublicKey as any, nullified: false } })).map(
      noteDaoToNote,
    );
  }

  async getPendingNotes(accountPublicKey: GrumpkinAddress) {
    return (await this.noteRep.find({ where: { owner: accountPublicKey as any, index: IsNull() } })).map(noteDaoToNote);
  }

  async removeNote(nullifier: Buffer) {
    await this.noteRep.delete({ nullifier });
  }

  async getAccount(accountPublicKey: GrumpkinAddress) {
    return nullToUndefined(await this.userDataRep.findOne({ where: { accountPublicKey } as any }));
  }

  async addAccount(account: AccountData) {
    await this.userDataRep.save(account);
  }

  async getAccounts() {
    return await this.userDataRep.find();
  }

  async removeAccount(accountPublicKey: GrumpkinAddress) {
    await this.removeAccountInternal(accountPublicKey);
  }

  private async removeAccountInternal(accountPublicKey: any) {
    const user = await this.getAccount(accountPublicKey);
    if (!user) return;

    await this.accountTxRep.delete({ accountPublicKey });
    await this.claimTxRep.delete({ accountPublicKey });
    await this.paymentTxRep.delete({ accountPublicKey });
    await this.spendingKeyRep.delete({ accountPublicKey });
    await this.noteRep.delete({ owner: accountPublicKey });
    await this.userDataRep.delete({ accountPublicKey });
  }

  async addPaymentTx(tx: CorePaymentTx) {
    await this.paymentTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getPaymentTx(accountPublicKey: GrumpkinAddress, txId: TxId) {
    const tx = await this.paymentTxRep.findOne({ where: { txId, accountPublicKey } as any });
    return tx ? toCorePaymentTx(tx) : undefined;
  }

  async getPaymentTxs(accountPublicKey: GrumpkinAddress) {
    const txs = await this.paymentTxRep.find({ where: { accountPublicKey } as any, order: { settled: 'DESC' } });
    return sortTxs(txs).map(toCorePaymentTx);
  }

  async addAccountTx(tx: CoreAccountTx) {
    await this.accountTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getAccountTx(txId: TxId) {
    const tx = await this.accountTxRep.findOne({ where: { txId } as any });
    return tx ? toCoreAccountTx(tx) : undefined;
  }

  async getAccountTxs(accountPublicKey: GrumpkinAddress) {
    const txs = await this.accountTxRep.find({ where: { accountPublicKey } as any, order: { settled: 'DESC' } });
    return sortTxs(txs).map(toCoreAccountTx);
  }

  async addDefiTx(tx: CoreDefiTx) {
    await this.defiTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getDefiTx(txId: TxId) {
    const tx = await this.defiTxRep.findOne({ where: { txId } as any });
    return tx ? toCoreDefiTx(tx) : undefined;
  }

  async getDefiTxs(accountPublicKey: GrumpkinAddress) {
    const txs = await this.defiTxRep.find({ where: { accountPublicKey } as any, order: { settled: 'DESC' } });
    return sortTxs(txs).map(toCoreDefiTx);
  }

  async getDefiTxsByNonce(accountPublicKey: GrumpkinAddress, interactionNonce: number) {
    const txs = await this.defiTxRep.find({
      where: { accountPublicKey, interactionNonce } as any,
      order: { settled: 'DESC' },
    });
    return sortTxs(txs).map(toCoreDefiTx);
  }

  async addClaimTx(tx: CoreClaimTx) {
    await this.claimTxRep.save(tx);
  }

  async getClaimTx(nullifier: Buffer) {
    return nullToUndefined(await this.claimTxRep.findOne({ where: { nullifier } as any }));
  }

  async getTxs(accountPublicKey: GrumpkinAddress) {
    const txs = (
      await Promise.all([
        this.getAccountTxs(accountPublicKey),
        this.getPaymentTxs(accountPublicKey),
        this.getDefiTxs(accountPublicKey),
      ])
    ).flat();
    const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
    const settled = txs
      .filter(tx => tx.settled)
      .sort((a, b) => (a.settled! < b.settled! ? 1 : a.settled! > b.settled! ? -1 : 0));
    return [...unsettled, ...settled];
  }

  async isTxSettled(txId: TxId) {
    const jsTxs = await this.paymentTxRep.find({ where: { txId } as any });
    if (jsTxs.length > 0) {
      return jsTxs.every(tx => tx.settled);
    }

    const defiTx = await this.defiTxRep.findOne({ where: { txId } as any });
    if (defiTx) {
      return !!defiTx.settled;
    }

    const accountTx = await this.accountTxRep.findOne({ where: { txId } as any });
    return !!accountTx?.settled;
  }

  async getPendingTxs(accountPublicKey: GrumpkinAddress) {
    const unsettledTxs = await Promise.all([
      this.accountTxRep.find({ where: { accountPublicKey, settled: IsNull() } as any }),
      this.paymentTxRep.find({ where: { accountPublicKey, settled: IsNull() } as any }),
      this.defiTxRep.find({ where: { accountPublicKey, settled: IsNull() } as any }),
    ]);
    return unsettledTxs.flat().map(({ txId }) => txId);
  }

  async removeTx(accountPublicKey: GrumpkinAddress, txId: TxId) {
    await Promise.all([
      this.accountTxRep.delete({ txId } as any),
      this.paymentTxRep.delete({ txId, accountPublicKey } as any),
      this.defiTxRep.delete({ txId, accountPublicKey } as any),
    ]);
  }

  async addSpendingKey(spendingKey: SpendingKey) {
    await this.spendingKeyRep.save(spendingKey);
  }

  // attempt to efficiently bulk upsert a large number of entities in one transaction
  // performed using smaller batch sizes as a single save on anything more than a few hundred entities throws SQL exceptions
  // the batch size that's possible with the given entity isn't known in advance, so we use an initial size and attempt the set of upserts
  // if the operation fails we reduce the batch size and try again
  // here we are using QueryRunner instead of EntityManager as it gives us finer control over the transaction execution
  private async addBulkItems<Entity, InputType>(
    entityName: string,
    items: InputType[],
    newEntity: { new (input: InputType): Entity },
    initialBatchSize,
  ) {
    let batchSize = initialBatchSize;
    let commited = false;
    while (!commited) {
      const itemsCopy = [...items];
      const queryRunner = this.connection.createQueryRunner();

      // establish real database connection using our new query runner
      await queryRunner.connect();
      const entities = queryRunner.manager.getRepository<Entity>(entityName);
      await queryRunner.startTransaction();
      try {
        while (itemsCopy.length) {
          const keysSlice = itemsCopy.slice(0, batchSize).map(k => new newEntity(k));
          await entities.save(keysSlice);
          itemsCopy.splice(0, batchSize);
        }
        await queryRunner.commitTransaction();
        await queryRunner.release();
        commited = true;
      } catch (err) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        batchSize /= 2;
        if (batchSize < 1) {
          throw new Error(`Unable to insert entity, error: ${err}`);
        }
        batchSize = Math.round(batchSize);
      }
    }
  }

  async addSpendingKeys(spendingKeys: SpendingKey[]) {
    await this.addBulkItems('SpendingKeyDao', spendingKeys, SpendingKeyDao, 100);
  }

  async getSpendingKey(accountPublicKey: GrumpkinAddress, key: GrumpkinAddress) {
    const keyBuffer = key.toBuffer();
    const spendingKey = await this.spendingKeyRep.findOne({
      where: { accountPublicKey, key: keyBuffer.slice(0, 32) } as any,
    });
    return spendingKey ?? undefined;
  }

  async getSpendingKeys(accountPublicKey: GrumpkinAddress) {
    return await this.spendingKeyRep.find({ where: { accountPublicKey } as any });
  }

  async removeSpendingKeys(accountPublicKey: GrumpkinAddress) {
    await this.spendingKeyRep.delete({ accountPublicKey } as any);
  }

  async addAlias(alias: Alias) {
    await this.aliasRep.save(alias);
  }

  async addAliases(aliases: Alias[]) {
    await this.addBulkItems('AliasDao', aliases, AliasDao, 100);
  }

  async getAlias(accountPublicKey: GrumpkinAddress) {
    return nullToUndefined(await this.aliasRep.findOne({ where: { accountPublicKey } as any }));
  }

  async getAliases(aliasHash: AliasHash) {
    return await this.aliasRep.find({ where: { aliasHash } as any, order: { index: 'DESC' } });
  }

  async addKey(name: string, value: Buffer) {
    await this.keyRep.save({ name, value });
  }

  async getKey(name: string) {
    const key = await this.keyRep.findOne({ where: { name } as any });
    return key ? key.value : undefined;
  }

  async deleteKey(name: string) {
    await this.keyRep.delete({ name });
  }

  async acquireLock(name: string, timeout: number) {
    await this.mutex.delete({ name, expiredAt: LessThanOrEqual(Date.now()) });
    try {
      await this.mutex.insert({ name, expiredAt: Date.now() + timeout });
      return true;
    } catch (e) {
      return false;
    }
  }

  async extendLock(name: string, timeout: number) {
    await this.mutex.update(name, { expiredAt: Date.now() + timeout });
  }

  async releaseLock(name: string) {
    await this.mutex.delete({ name });
  }

  public async setGenesisData(data: Buffer) {
    await this.addKey(this.genesisDataKey, data);
  }

  public async getGenesisData() {
    const data = await this.getKey(this.genesisDataKey);
    return data ?? Buffer.alloc(0);
  }
}

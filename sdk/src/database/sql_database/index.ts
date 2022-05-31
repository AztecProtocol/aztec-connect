import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { Connection, ConnectionOptions, getConnection, IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx } from '../../core_tx';
import { Note } from '../../note';
import { UserData } from '../../user';
import { Alias, Database, SpendingKey } from '../database';
import { AccountTxDao } from './account_tx_dao';
import { AliasDao } from './alias_dao';
import { ClaimTxDao } from './claim_tx_dao';
import { DefiTxDao } from './defi_tx_dao';
import { KeyDao } from './key_dao';
import { MutexDao } from './mutex_dao';
import { NoteDao, noteDaoToNote, noteToNoteDao } from './note_dao';
import { PaymentTxDao } from './payment_tx_dao';
import { SpendingKeyDao } from './spending_key_dao';
import { UserDataDao } from './user_data_dao';

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
    tx.userId,
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
    tx.userId,
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
    tx.userId,
    tx.bridgeId,
    tx.depositValue,
    tx.txFee,
    tx.partialStateSecret,
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

const sortUserTxs = (txs: any[]) => {
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

  async init() {}

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
    const note = await this.noteRep.findOne({ commitment });
    return note ? noteDaoToNote(note) : undefined;
  }

  async getNoteByNullifier(nullifier: Buffer) {
    const note = await this.noteRep.findOne({ nullifier });
    return note ? noteDaoToNote(note) : undefined;
  }

  async nullifyNote(nullifier: Buffer) {
    await this.noteRep.update({ nullifier }, { nullified: true });
  }

  async getNotes(userId: GrumpkinAddress) {
    return (await this.noteRep.find({ where: { owner: userId, nullified: false } })).map(noteDaoToNote);
  }

  async getPendingNotes(userId: GrumpkinAddress) {
    return (await this.noteRep.find({ where: { owner: userId, index: IsNull() } })).map(noteDaoToNote);
  }

  async removeNote(nullifier: Buffer) {
    await this.noteRep.delete({ nullifier });
  }

  async getUser(userId: GrumpkinAddress) {
    return this.userDataRep.findOne({ id: userId });
  }

  async addUser(user: UserData) {
    await this.userDataRep.save(user);
  }

  async getUsers() {
    return this.userDataRep.find();
  }

  async updateUser(user: UserData) {
    await this.userDataRep.update({ id: user.id }, user);
  }

  async removeUser(userId: GrumpkinAddress) {
    const user = await this.getUser(userId);
    if (!user) return;

    await this.accountTxRep.delete({ userId });
    await this.claimTxRep.delete({ userId });
    await this.paymentTxRep.delete({ userId });
    await this.spendingKeyRep.delete({ userId });
    await this.noteRep.delete({ owner: userId });
    await this.userDataRep.delete({ id: userId });
  }

  async resetUsers() {
    await this.noteRep.clear();
    await this.spendingKeyRep.clear();
    await this.accountTxRep.clear();
    await this.claimTxRep.clear();
    await this.paymentTxRep.clear();
    await this.userDataRep.update({ syncedToRollup: MoreThan(-1) }, { syncedToRollup: -1 });
  }

  async addPaymentTx(tx: CorePaymentTx) {
    await this.paymentTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getPaymentTx(userId: GrumpkinAddress, txId: TxId) {
    const tx = await this.paymentTxRep.findOne({ txId, userId });
    return tx ? toCorePaymentTx(tx) : undefined;
  }

  async getPaymentTxs(userId) {
    const txs = await this.paymentTxRep.find({ where: { userId }, order: { settled: 'DESC' } });
    return sortUserTxs(txs).map(toCorePaymentTx);
  }

  async settlePaymentTx(userId: GrumpkinAddress, txId: TxId, settled: Date) {
    await this.paymentTxRep.update({ txId, userId }, { settled });
  }

  async addAccountTx(tx: CoreAccountTx) {
    await this.accountTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getAccountTx(txId: TxId) {
    const tx = await this.accountTxRep.findOne({ txId });
    return tx ? toCoreAccountTx(tx) : undefined;
  }

  async getAccountTxs(userId) {
    const txs = await this.accountTxRep.find({ where: { userId }, order: { settled: 'DESC' } });
    return sortUserTxs(txs).map(toCoreAccountTx);
  }

  async settleAccountTx(txId: TxId, settled: Date) {
    await this.accountTxRep.update({ txId }, { settled });
  }

  async addDefiTx(tx: CoreDefiTx) {
    await this.defiTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getDefiTx(txId: TxId) {
    const tx = await this.defiTxRep.findOne({ txId });
    return tx ? toCoreDefiTx(tx) : undefined;
  }

  async getDefiTxs(userId) {
    const txs = await this.defiTxRep.find({ where: { userId }, order: { settled: 'DESC' } });
    return sortUserTxs(txs).map(toCoreDefiTx);
  }

  async getDefiTxsByNonce(userId: GrumpkinAddress, interactionNonce: number) {
    const txs = await this.defiTxRep.find({ where: { userId, interactionNonce }, order: { settled: 'DESC' } });
    return sortUserTxs(txs).map(toCoreDefiTx);
  }

  async settleDefiDeposit(txId: TxId, interactionNonce: number, isAsync: boolean, settled: Date) {
    await this.defiTxRep.update({ txId }, { interactionNonce, isAsync, settled });
  }

  async updateDefiTxFinalisationResult(
    txId: TxId,
    success: boolean,
    outputValueA: bigint,
    outputValueB: bigint,
    finalised: Date,
  ) {
    await this.defiTxRep.update({ txId }, { success, outputValueA, outputValueB, finalised });
  }

  async settleDefiTx(txId: TxId, claimSettled: Date, claimTxId: TxId) {
    await this.defiTxRep.update({ txId }, { claimSettled, claimTxId });
  }

  async addClaimTx(tx: CoreClaimTx) {
    await this.claimTxRep.save(tx);
  }

  async getClaimTx(nullifier: Buffer) {
    return this.claimTxRep.findOne({ nullifier });
  }

  async getUserTxs(userId: GrumpkinAddress) {
    const txs = (
      await Promise.all([this.getAccountTxs(userId), this.getPaymentTxs(userId), this.getDefiTxs(userId)])
    ).flat();
    const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
    const settled = txs
      .filter(tx => tx.settled)
      .sort((a, b) => (a.settled! < b.settled! ? 1 : a.settled! > b.settled! ? -1 : 0));
    return [...unsettled, ...settled];
  }

  async isUserTxSettled(txId: TxId) {
    const jsTxs = await this.paymentTxRep.find({ where: { txId } });
    if (jsTxs.length > 0) {
      return jsTxs.every(tx => tx.settled);
    }

    const defiTx = await this.defiTxRep.findOne({ where: { txId } });
    if (defiTx) {
      return !!defiTx.settled;
    }

    const accountTx = await this.accountTxRep.findOne({ where: { txId } });
    return !!accountTx?.settled;
  }

  async getPendingUserTxs(userId: GrumpkinAddress) {
    const unsettledTxs = await Promise.all([
      this.accountTxRep.find({ where: { userId, settled: IsNull() } }),
      this.paymentTxRep.find({ where: { userId, settled: IsNull() } }),
      this.defiTxRep.find({ where: { userId, settled: IsNull() } }),
    ]);
    return unsettledTxs.flat().map(({ txId }) => txId);
  }

  async removeUserTx(userId: GrumpkinAddress, txId: TxId) {
    await Promise.all([
      this.accountTxRep.delete({ txId }),
      this.paymentTxRep.delete({ txId, userId }),
      this.defiTxRep.delete({ txId, userId }),
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
      const connection = getConnection(this.connection.name);
      const queryRunner = connection.createQueryRunner();

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

  async getSpendingKey(userId: GrumpkinAddress, key: GrumpkinAddress) {
    const keyBuffer = key.toBuffer();
    const spendingKey = await this.spendingKeyRep.findOne({ where: { userId, key: keyBuffer.slice(0, 32) } });
    return spendingKey ?? undefined;
  }

  async getSpendingKeys(userId: GrumpkinAddress) {
    return await this.spendingKeyRep.find({ userId });
  }

  async removeSpendingKeys(userId: GrumpkinAddress) {
    await this.spendingKeyRep.delete({ userId });
  }

  async addAlias(alias: Alias) {
    await this.aliasRep.save(alias);
  }

  async addAliases(aliases: Alias[]) {
    await this.addBulkItems('AliasDao', aliases, AliasDao, 100);
  }

  async getAlias(accountPublicKey: GrumpkinAddress) {
    return this.aliasRep.findOne({ accountPublicKey });
  }

  async getAliases(aliasHash: AliasHash) {
    return this.aliasRep.find({ where: { aliasHash }, order: { index: 'DESC' } });
  }

  async addKey(name: string, value: Buffer) {
    await this.keyRep.save({ name, value });
  }

  async getKey(name: string) {
    const key = await this.keyRep.findOne({ name });
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
}

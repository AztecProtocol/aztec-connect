import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Connection, ConnectionOptions, IsNull, MoreThan, MoreThanOrEqual, Repository, getConnection } from 'typeorm';
import { Note } from '../../note';
import { AccountId, UserData } from '../../user';
import { UserAccountTx, UserDefiTx, UserJoinSplitTx } from '../../user_tx';
import { Claim } from '../claim';
import { Alias, Database, SigningKey } from '../database';
import { AccountTxDao } from './account_tx_dao';
import { AliasDao } from './alias_dao';
import { ClaimDao } from './claim_dao';
import { DefiTxDao } from './defi_tx_dao';
import { JoinSplitTxDao } from './join_split_tx_dao';
import { KeyDao } from './key_dao';
import { NoteDao } from './note_dao';
import { UserDataDao } from './user_data_dao';
import { UserKeyDao } from './user_key_dao';

export const getOrmConfig = (dbPath?: string): ConnectionOptions => ({
  name: 'aztec2-sdk',
  type: 'sqlite',
  database: dbPath === ':memory:' ? dbPath : `${dbPath || '.'}/aztec2-sdk.sqlite`,
  entities: [AccountTxDao, AliasDao, ClaimDao, DefiTxDao, JoinSplitTxDao, KeyDao, NoteDao, UserDataDao, UserKeyDao],
  synchronize: true,
  logging: false,
});

const toUserJoinSplitTx = (tx: JoinSplitTxDao) =>
  new UserJoinSplitTx(
    tx.txHash,
    tx.userId,
    tx.assetId,
    tx.publicInput,
    tx.publicOutput,
    tx.privateInput,
    tx.recipientPrivateOutput,
    tx.senderPrivateOutput,
    tx.inputOwner,
    tx.outputOwner,
    tx.ownedByUser,
    tx.created,
    tx.settled,
  );

const toUserAccountTx = (tx: AccountTxDao) =>
  new UserAccountTx(
    tx.txHash,
    tx.userId,
    tx.aliasHash,
    tx.newSigningPubKey1,
    tx.newSigningPubKey2,
    tx.migrated,
    tx.created,
    tx.settled,
  );

const toUserDefiTx = (tx: DefiTxDao) =>
  new UserDefiTx(
    tx.txHash,
    tx.userId,
    tx.bridgeId,
    tx.depositValue,
    tx.partialStateSecret,
    tx.txFee,
    tx.created,
    tx.outputValueA,
    tx.outputValueB,
    tx.settled,
  );

export class SQLDatabase implements Database {
  private accountTxRep: Repository<AccountTxDao>;
  private aliasRep: Repository<AliasDao>;
  private claimRep: Repository<ClaimDao>;
  private defiTxRep: Repository<DefiTxDao>;
  private joinSplitTxRep: Repository<JoinSplitTxDao>;
  private keyRep: Repository<KeyDao>;
  private noteRep: Repository<NoteDao>;
  private userDataRep: Repository<UserDataDao>;
  private userKeyRep: Repository<UserKeyDao>;

  constructor(private connection: Connection) {
    this.accountTxRep = this.connection.getRepository(AccountTxDao);
    this.aliasRep = this.connection.getRepository(AliasDao);
    this.claimRep = this.connection.getRepository(ClaimDao);
    this.defiTxRep = this.connection.getRepository(DefiTxDao);
    this.joinSplitTxRep = this.connection.getRepository(JoinSplitTxDao);
    this.keyRep = this.connection.getRepository(KeyDao);
    this.noteRep = this.connection.getRepository(NoteDao);
    this.userDataRep = this.connection.getRepository(UserDataDao);
    this.userKeyRep = this.connection.getRepository(UserKeyDao);
  }

  async init() {}

  async close() {
    await this.connection.close();
  }

  async clear() {
    await this.connection.synchronize(true);
  }

  async addNote(note: Note) {
    await this.noteRep.save(note);
  }

  async getNote(commitment: Buffer) {
    return this.noteRep.findOne({ commitment });
  }

  async getNoteByNullifier(nullifier: Buffer) {
    return this.noteRep.findOne({ nullifier });
  }

  async nullifyNote(nullifier: Buffer) {
    await this.noteRep.update({ nullifier }, { nullified: true });
  }

  async getUserNotes(userId: AccountId) {
    return this.noteRep.find({ where: { owner: userId, nullified: false } });
  }

  async getUserPendingNotes(userId: AccountId) {
    return this.noteRep.find({ where: { owner: userId, pending: true } });
  }

  async removeNote(nullifier: Buffer) {
    await this.noteRep.delete({ nullifier });
  }

  async addClaim(claim: Claim) {
    await this.claimRep.save(claim);
  }

  async getClaim(nullifier: Buffer) {
    return this.claimRep.findOne({ nullifier });
  }

  async getUser(userId: AccountId) {
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

  async removeUser(userId: AccountId) {
    const user = await this.getUser(userId);
    if (!user) return;

    await this.accountTxRep.delete({ userId });
    await this.joinSplitTxRep.delete({ userId });
    await this.userKeyRep.delete({ accountId: userId });
    await this.noteRep.delete({ owner: userId });
    await this.userDataRep.delete({ id: userId });
  }

  async resetUsers() {
    await this.aliasRep.clear();
    await this.noteRep.clear();
    await this.userKeyRep.clear();
    await this.accountTxRep.clear();
    await this.joinSplitTxRep.clear();
    await this.userDataRep.update({ syncedToRollup: MoreThan(-1) }, { syncedToRollup: -1 });
  }

  async addJoinSplitTx(tx: UserJoinSplitTx) {
    await this.joinSplitTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getJoinSplitTx(txHash: TxHash, userId: AccountId) {
    const tx = await this.joinSplitTxRep.findOne({ txHash, userId });
    return tx ? toUserJoinSplitTx(tx) : undefined;
  }

  async getJoinSplitTxs(userId) {
    const txs = await this.joinSplitTxRep.find({ where: { userId }, order: { settled: 'DESC' } });
    const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
    const settled = txs.filter(tx => tx.settled);
    return [...unsettled, ...settled].map(toUserJoinSplitTx);
  }

  async settleJoinSplitTx(txHash: TxHash, userId: AccountId, settled: Date) {
    await this.joinSplitTxRep.update({ txHash, userId }, { settled });
  }

  async addAccountTx(tx: UserAccountTx) {
    await this.accountTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getAccountTx(txHash: TxHash) {
    const tx = await this.accountTxRep.findOne({ txHash });
    return tx ? toUserAccountTx(tx) : undefined;
  }

  async getAccountTxs(userId) {
    const txs = await this.accountTxRep.find({ where: { userId }, order: { settled: 'DESC' } });
    const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
    const settled = txs.filter(tx => tx.settled);
    return [...unsettled, ...settled].map(toUserAccountTx);
  }

  async settleAccountTx(txHash: TxHash, settled: Date) {
    await this.accountTxRep.update({ txHash }, { settled });
  }

  async addDefiTx(tx: UserDefiTx) {
    await this.defiTxRep.save({ ...tx }); // save() will mutate tx, changing undefined values to null.
  }

  async getDefiTx(txHash: TxHash) {
    const tx = await this.defiTxRep.findOne({ txHash });
    return tx ? toUserDefiTx(tx) : undefined;
  }

  async getDefiTxs(userId) {
    const txs = await this.defiTxRep.find({ where: { userId }, order: { settled: 'DESC' } });
    const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
    const settled = txs.filter(tx => tx.settled);
    return [...unsettled, ...settled].map(toUserDefiTx);
  }

  async updateDefiTx(txHash: TxHash, outputValueA: bigint, outputValueB: bigint) {
    await this.defiTxRep.update({ txHash }, { outputValueA, outputValueB });
  }

  async settleDefiTx(txHash: TxHash, settled: Date) {
    await this.defiTxRep.update({ txHash }, { settled });
  }

  async isUserTxSettled(txHash: TxHash) {
    const jsTxs = await this.joinSplitTxRep.find({ where: { txHash } });
    if (jsTxs.length > 0) {
      return jsTxs.every(tx => tx.settled);
    }

    const defiTx = await this.defiTxRep.findOne({ where: { txHash } });
    if (defiTx) {
      return !!defiTx.settled;
    }

    const accountTx = await this.accountTxRep.findOne({ where: { txHash } });
    return !!accountTx?.settled;
  }

  async getUnsettledUserTxs(userId: AccountId) {
    const unsettledTxs = await Promise.all([
      this.accountTxRep.find({ where: { userId, settled: IsNull() } }),
      this.joinSplitTxRep.find({ where: { userId, settled: IsNull() } }),
    ]);
    return unsettledTxs.flat().map(({ txHash }) => txHash);
  }

  async removeUserTx(txHash: TxHash, userId: AccountId) {
    await Promise.all([this.accountTxRep.delete({ txHash }), this.joinSplitTxRep.delete({ txHash, userId })]);
  }

  async addUserSigningKey(signingKey: SigningKey) {
    await this.userKeyRep.save(signingKey);
  }

  // attempt to efficiently bulk upsert a large number of entities in one transaction
  // performed using smaller batch sizes as a single save on anything more than a few hundred entities throws SQL exceptions
  // the batch size that's possible with the given entity isn't known in advance, so we use an initial size and attempt the set of upserts
  // if the operation fails we reduce the batch size and try again
  // here we are using QueryRunner instead of EntityManager as it gives us finer control over the transaction execution
  async addBulkItems<Entity, InputType>(
    entityName: string,
    items: InputType[],
    newEntity: { new (input: InputType): Entity },
    initialBatchSize,
  ) {
    let batchSize = initialBatchSize;
    let commited = false;
    while (!commited) {
      const itemsCopy = [...items];
      const connection = getConnection(getOrmConfig().name);
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

  async addUserSigningKeys(signingKeys: SigningKey[]) {
    await this.addBulkItems('UserKeyDao', signingKeys, UserKeyDao, 100);
  }

  async getUserSigningKeys(accountId: AccountId) {
    return await this.userKeyRep.find({ accountId });
  }

  async getUserSigningKeyIndex(accountId: AccountId, key: GrumpkinAddress) {
    const keyBuffer = key.toBuffer();
    const signingKey = await this.userKeyRep.findOne({ where: { accountId, key: keyBuffer.slice(0, 32) } });
    return signingKey ? signingKey.treeIndex : undefined;
  }

  async removeUserSigningKeys(accountId: AccountId) {
    await this.userKeyRep.delete({ accountId });
  }

  async setAlias(alias: Alias) {
    await this.aliasRep.save(alias);
  }

  async setAliases(aliases: Alias[]) {
    await this.addBulkItems('AliasDao', aliases, AliasDao, 100);
  }

  async getAlias(aliasHash: AliasHash, address: GrumpkinAddress) {
    return this.aliasRep.findOne({ aliasHash, address });
  }

  async getAliases(aliasHash: AliasHash) {
    return this.aliasRep.find({ aliasHash });
  }

  async getLatestNonceByAddress(address: GrumpkinAddress) {
    const alias = await this.aliasRep.findOne({ where: { address }, order: { latestNonce: 'DESC' } });
    return alias?.latestNonce;
  }

  async getLatestAlias(aliasHash: AliasHash) {
    const alias = await this.aliasRep.findOne({ where: { aliasHash }, order: { latestNonce: 'DESC' } });
    return alias;
  }

  async getAliasHashByAddress(address: GrumpkinAddress, nonce?: number) {
    const alias = await this.aliasRep.findOne({
      where: { address, latestNonce: MoreThanOrEqual(nonce || 0) },
      order: { latestNonce: nonce !== undefined ? 'ASC' : 'DESC' },
    });
    return alias?.aliasHash;
  }

  async getAccountId(aliasHash: AliasHash, nonce?: number) {
    const alias = await this.aliasRep.findOne({
      where: { aliasHash, latestNonce: MoreThanOrEqual(nonce || 0) },
      order: { latestNonce: nonce !== undefined ? 'ASC' : 'DESC' },
    });
    return alias ? new AccountId(alias.address, nonce ?? alias.latestNonce) : undefined;
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
}

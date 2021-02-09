import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/tx_hash';
import { Connection, ConnectionOptions, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Note } from '../../note';
import { UserData, AccountId } from '../../user';
import { UserAccountTx, UserJoinSplitTx } from '../../user_tx';
import { Alias, Database, SigningKey } from '../database';
import { AliasDao } from './alias_dao';
import { KeyDao } from './key_dao';
import { NoteDao } from './note_dao';
import { AccountTxDao } from './account_tx_dao';
import { UserDataDao } from './user_data_dao';
import { JoinSplitTxDao } from './join_split_tx_dao';
import { UserKeyDao } from './user_key_dao';

export const getOrmConfig = (dbPath?: string): ConnectionOptions => ({
  name: 'aztec2-sdk',
  type: 'sqlite',
  database: dbPath === ':memory:' ? dbPath : `${dbPath || '.'}/aztec2-sdk.sqlite`,
  entities: [AccountTxDao, AliasDao, JoinSplitTxDao, KeyDao, NoteDao, UserDataDao, UserKeyDao],
  synchronize: true,
  logging: false,
});

export class SQLDatabase implements Database {
  private accountTxRep: Repository<AccountTxDao>;
  private aliasRep: Repository<AliasDao>;
  private keyRep: Repository<KeyDao>;
  private noteRep: Repository<NoteDao>;
  private userDataRep: Repository<UserDataDao>;
  private userKeyRep: Repository<UserKeyDao>;
  private joinSplitTxRep: Repository<JoinSplitTxDao>;

  constructor(private connection: Connection) {
    this.accountTxRep = this.connection.getRepository(AccountTxDao);
    this.aliasRep = this.connection.getRepository(AliasDao);
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

  async getNote(index: number) {
    return this.noteRep.findOne({ index });
  }

  async getNoteByNullifier(nullifier: Buffer) {
    return this.noteRep.findOne({ nullifier });
  }

  async nullifyNote(index: number) {
    await this.noteRep.update(index, { nullified: true });
  }

  async getUserNotes(userId: AccountId) {
    return this.noteRep.find({ where: { owner: userId, nullified: false } });
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

    await this.userKeyRep.delete({ address: user.publicKey });
    await this.accountTxRep.delete({ userId });
    await this.joinSplitTxRep.delete({ userId });
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
    await this.joinSplitTxRep.save(tx);
  }

  async getJoinSplitTx(userId: AccountId, txHash: TxHash) {
    return this.joinSplitTxRep.findOne({ txHash, userId });
  }

  async getJoinSplitTxs(userId) {
    return this.joinSplitTxRep.find({ where: { userId }, order: { created: 'DESC' } });
  }

  async getJoinSplitTxsByTxHash(txHash: TxHash) {
    return this.joinSplitTxRep.find({ where: { txHash } });
  }

  async settleJoinSplitTx(txHash: TxHash) {
    await this.joinSplitTxRep.update({ txHash }, { settled: true });
  }

  async addAccountTx(tx: UserAccountTx) {
    await this.accountTxRep.save(tx);
  }

  async getAccountTx(txHash: TxHash) {
    return this.accountTxRep.findOne({ txHash });
  }

  async getAccountTxs(userId) {
    return this.accountTxRep.find({ where: { userId }, order: { created: 'DESC' } });
  }

  async settleAccountTx(txHash: TxHash) {
    await this.accountTxRep.update({ txHash }, { settled: true });
  }

  async addUserSigningKey(signingKey: SigningKey) {
    await this.userKeyRep.save(signingKey);
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
    // TODO: Dedupe for bulk insert.
    for (const alias of aliases) {
      await this.aliasRep.save(alias);
    }
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

  async getLatestNonceByAliasHash(aliasHash: AliasHash) {
    const alias = await this.aliasRep.findOne({ where: { aliasHash }, order: { latestNonce: 'DESC' } });
    return alias?.latestNonce;
  }

  async getAliasHashByAddress(address: GrumpkinAddress, nonce?: number) {
    const alias = await this.aliasRep.findOne({
      where: { address, latestNonce: MoreThanOrEqual(nonce || 0) },
      order: { latestNonce: nonce !== undefined ? 'ASC' : 'DESC' },
    });
    return alias?.aliasHash;
  }

  async getAddressByAliasHash(aliasHash: AliasHash, nonce?: number) {
    const alias = await this.aliasRep.findOne({
      where: { aliasHash, latestNonce: MoreThanOrEqual(nonce || 0) },
      order: { latestNonce: nonce !== undefined ? 'ASC' : 'DESC' },
    });
    return alias?.address;
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

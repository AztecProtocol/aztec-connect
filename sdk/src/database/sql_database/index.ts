import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import { Connection, ConnectionOptions, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Note } from '../../note';
import { AccountAliasId, UserData, AccountId } from '../../user';
import { UserTx } from '../../user_tx';
import { Alias, Database, SigningKey } from '../database';
import { AliasDao } from './alias_dao';
import { KeyDao } from './key_dao';
import { NoteDao } from './note_dao';
import { UserDataDao } from './user_data_dao';
import { UserKeyDao } from './user_key_dao';
import { UserTxDao } from './user_tx_dao';

export const getOrmConfig = (dbPath?: string): ConnectionOptions => ({
  name: 'aztec2-sdk',
  type: 'sqlite',
  database: dbPath === ':memory:' ? dbPath : `${dbPath || '.'}/aztec2-sdk.sqlite`,
  entities: [AliasDao, KeyDao, NoteDao, UserDataDao, UserKeyDao, UserTxDao],
  synchronize: true,
  logging: false,
});

export class SQLDatabase implements Database {
  private aliasRep: Repository<AliasDao>;
  private keyRep: Repository<KeyDao>;
  private noteRep: Repository<NoteDao>;
  private userDataRep: Repository<UserDataDao>;
  private userKeyRep: Repository<UserKeyDao>;
  private userTxRep: Repository<UserTxDao>;

  constructor(private connection: Connection) {
    this.aliasRep = this.connection.getRepository(AliasDao);
    this.keyRep = this.connection.getRepository(KeyDao);
    this.noteRep = this.connection.getRepository(NoteDao);
    this.userDataRep = this.connection.getRepository(UserDataDao);
    this.userKeyRep = this.connection.getRepository(UserKeyDao);
    this.userTxRep = this.connection.getRepository(UserTxDao);
  }

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
    await this.userTxRep.delete({ userId });
    await this.noteRep.delete({ owner: userId });
    await this.userDataRep.delete({ id: userId });
  }

  async resetUsers() {
    await this.aliasRep.clear();
    await this.noteRep.clear();
    await this.userKeyRep.clear();
    await this.userTxRep.clear();
    await this.userDataRep.update({ syncedToRollup: MoreThan(-1) }, { syncedToRollup: -1 });
  }

  async getUserTx(userId: AccountId, txHash: TxHash) {
    return this.userTxRep.findOne({ txHash, userId });
  }

  async addUserTx(userTx: UserTx) {
    await this.userTxRep.save(userTx);
  }

  async getUserTxs(userId: AccountId) {
    return this.userTxRep.find({ where: { userId }, order: { created: 'DESC' } });
  }

  async getUserTxsByTxHash(txHash: TxHash) {
    return this.userTxRep.find({ where: { txHash } });
  }

  async settleUserTx(userId: AccountId, txHash: TxHash) {
    await this.userTxRep.update({ userId, txHash }, { settled: true });
  }

  async addUserSigningKey(signingKey: SigningKey) {
    await this.userKeyRep.save(signingKey);
  }

  async getUserSigningKeys(accountAliasId: AccountAliasId) {
    return await this.userKeyRep.find({ accountAliasId });
  }

  async getUserSigningKeyIndex(accountAliasId: AccountAliasId, key: GrumpkinAddress) {
    const keyBuffer = key.toBuffer();
    const signingKey = await this.userKeyRep.findOne({ where: { accountAliasId, key: keyBuffer.slice(0, 32) } });
    return signingKey ? signingKey.treeIndex : undefined;
  }

  async removeUserSigningKeys(accountAliasId: AccountAliasId) {
    await this.userKeyRep.delete({ accountAliasId });
  }

  async addAlias(alias: Alias) {
    await this.aliasRep.save(alias);
  }

  async updateAlias(alias: Alias) {
    await this.aliasRep.update({ aliasHash: alias.aliasHash, address: alias.address }, alias);
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

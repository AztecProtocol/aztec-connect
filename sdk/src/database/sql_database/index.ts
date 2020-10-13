import { GrumpkinAddress } from 'barretenberg/address';
import { Connection, ConnectionOptions, MoreThan, Repository } from 'typeorm';
import { Note } from '../../note';
import { UserData } from '../../user';
import { UserTx } from '../../user_tx';
import { Database, SigningKey } from '../database';
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

  async getNoteByNullifier(userId: Buffer, nullifier: Buffer) {
    return this.noteRep.findOne({ owner: userId, nullifier });
  }

  async nullifyNote(index: number) {
    const note = await this.getNote(index);
    if (!note) {
      throw new Error(`Not not found: ${index}`);
    }

    note.nullified = true;
    await this.noteRep.save(note);
  }

  async getUserNotes(userId: Buffer) {
    return this.noteRep.find({ where: { owner: userId, nullified: false } });
  }

  async getUser(userId: Buffer) {
    return this.userDataRep.findOne({ id: userId });
  }

  async addUser(user: UserData) {
    await this.userDataRep.save(user);
  }

  async getUserByPrivateKey(privateKey: Buffer) {
    return this.userDataRep.findOne({ privateKey });
  }

  async getUsers() {
    return this.userDataRep.find();
  }

  async updateUser(user: UserData) {
    await this.userDataRep.update({ id: user.id }, user);
  }

  async removeUser(userId: Buffer) {
    await this.userDataRep.delete({ id: userId });
  }

  async resetUsers() {
    await this.aliasRep.clear();
    await this.noteRep.clear();
    await this.userKeyRep.clear();
    await this.userTxRep.clear();
    await this.userDataRep.update({ syncedToRollup: MoreThan(-1) }, { syncedToRollup: -1 });
  }

  async getUserTx(userId: Buffer, txHash: Buffer) {
    return this.userTxRep.findOne({ txHash, userId });
  }

  async addUserTx(userTx: UserTx) {
    await this.userTxRep.save(userTx);
  }

  async getUserTxs(userId: Buffer) {
    return this.userTxRep.find({ where: { userId }, order: { created: 'DESC' } });
  }

  async settleUserTx(userId: Buffer, txHash: Buffer) {
    await this.userTxRep.update({ userId, txHash }, { settled: true });
  }

  async addUserSigningKey(signingKey: SigningKey) {
    await this.userKeyRep.save(signingKey);
  }

  async getUserSigningKeys(owner: Buffer) {
    return await this.userKeyRep.find({ owner });
  }

  async removeUserSigningKey({ owner, key }: SigningKey) {
    await this.userKeyRep.delete({ owner, key });
  }

  async getUserSigningKeyIndex(owner: Buffer, key: GrumpkinAddress) {
    const keyBuffer = key.toBuffer();
    const signingKey = await this.userKeyRep.findOne({ where: { owner, key: keyBuffer.slice(0, 32) } });
    return signingKey ? signingKey.treeIndex : undefined;
  }

  async addAlias(aliasHash: Buffer, address: GrumpkinAddress) {
    await this.aliasRep.save({ aliasHash, address });
  }

  async getAliasAddress(aliasHash: Buffer) {
    const alias = await this.aliasRep.findOne({ aliasHash });
    return alias ? alias.address : undefined;
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

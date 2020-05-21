import { Connection, Repository } from 'typeorm';
import { Key } from '../entity/key';
import { BaseDb } from './Base';

export class KeyDb extends BaseDb {
  constructor(connection: Connection, key: Key) {
    super(connection, key);
  }

  public async addKey(inputKey: Key) {
    const writeKey: any = new Key();
    writeKey.id = inputKey.id;
    writeKey.informationKeys = inputKey.informationKeys;

    await super.rep.save(writeKey);
  }
}

import { Connection, Repository } from 'typeorm';
import { Keys } from '../entity/Keys';
import { BaseDb } from './Base';

export class KeyDb extends BaseDb {
  constructor(connection: Connection, key: Keys) {
    super(connection, key);
  }

  public async addKey(inputKey: Keys) {
    const writeKey: any = new Keys();
    writeKey.id = inputKey.id;
    writeKey.informationKeys = inputKey.informationKeys;

    await super.rep.save(writeKey);
  }
}

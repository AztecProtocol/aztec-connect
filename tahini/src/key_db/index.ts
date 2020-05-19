import { Connection, Repository } from 'typeorm';
import { Key } from '../entity/key';

export class KeyDb {
  private keyRep!: Repository<Key>;

  constructor(private connection: Connection) {}

  public async init() {
    this.keyRep = this.connection.getRepository(Key);
  }

  public async addKey(inputKey: Key) {
      const key = new Key();
      key.id = inputKey.id;
      key.informationKey = inputKey.informationKey;

      await this.keyRep.save(key)
  }
}

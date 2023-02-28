import { KeyValueDatabase } from './key_value_database.js';

export class LocalStorageDb implements KeyValueDatabase {
  public close() {
    return Promise.resolve();
  }

  public clear() {
    localStorage.clear();
    return Promise.resolve();
  }

  public put(key: string, value: Buffer) {
    localStorage.setItem(key, value.toString('hex'));
    return Promise.resolve();
  }

  public get(key: string) {
    const value = localStorage.getItem(key);
    return Promise.resolve(value ? Buffer.from(value, 'hex') : undefined);
  }

  public del(key: string) {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
}

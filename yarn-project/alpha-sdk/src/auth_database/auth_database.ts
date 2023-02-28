import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { numToInt32BE } from '@aztec/barretenberg/serialize';
import { KeyValueDatabase } from '../key_value_database/index.js';
import { MemorySerialQueue } from '../serial_queue/index.js';

const AuthDbKeys = {
  ORIGIN_ACCOUNTS: (origin: string) => `aztec_auth_${origin}`,
};

export interface AuthAccountData {
  accountPublicKey: GrumpkinAddress;
  accountPrivateKey: Buffer;
  assets: number[];
}

const authAccountDataToBuffer = ({ accountPublicKey, accountPrivateKey, assets }: AuthAccountData) =>
  Buffer.concat([accountPublicKey.toBuffer(), accountPrivateKey, ...assets.map(a => numToInt32BE(a))]);

const authAccountDataFromBuffer = (buf: Buffer): AuthAccountData => {
  let dataStart = 0;
  const accountPublicKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + GrumpkinAddress.SIZE));
  dataStart += GrumpkinAddress.SIZE;
  const accountPrivateKey = buf.slice(dataStart, dataStart + 32);
  dataStart += 32;
  const assets: number[] = [];
  for (; dataStart < buf.length; dataStart += 4) {
    assets.push(buf.readUInt32BE(dataStart));
  }
  return { accountPublicKey, accountPrivateKey, assets };
};

export class AuthDatabase implements KeyValueDatabase {
  private serialQueue = new MemorySerialQueue();

  constructor(private db: KeyValueDatabase) {}

  public async close() {
    this.serialQueue.cancel();
    await this.db.close();
  }

  public async clear() {
    await this.db.clear();
  }

  public async get(key: string) {
    return await this.db.get(key).catch(() => undefined);
  }

  public async put(key: string, value: Buffer) {
    await this.db.put(key, value);
  }

  public async del(key: string) {
    await this.db.del(key);
  }

  public async getAccounts(origin: string): Promise<AuthAccountData[]> {
    const buf = await this.get(AuthDbKeys.ORIGIN_ACCOUNTS(origin));
    return buf
      ? JSON.parse(buf.toString('utf-8'))
          .map(a => Buffer.from(a, 'hex'))
          .map(authAccountDataFromBuffer)
      : [];
  }

  public async getAccount(origin: string, accountPublicKey: GrumpkinAddress) {
    const accounts = await this.getAccounts(origin);
    return accounts.find(a => a.accountPublicKey.equals(accountPublicKey));
  }

  public async addAccount(origin: string, account: AuthAccountData) {
    await this.serialQueue.push(async () => {
      const accounts = (await this.getAccounts(origin)).filter(
        a => !a.accountPublicKey.equals(account.accountPublicKey),
      );
      await this.addAccounts(origin, [...accounts, account]);
    });
  }

  public async removeAccount(origin: string, accountPublicKey: GrumpkinAddress) {
    await this.serialQueue.push(async () => {
      const accounts = (await this.getAccounts(origin)).filter(a => !a.accountPublicKey.equals(accountPublicKey));
      await this.addAccounts(origin, accounts);
    });
  }

  private async addAccounts(origin: string, accounts: AuthAccountData[]) {
    const json = JSON.stringify(accounts.map(authAccountDataToBuffer).map(a => a.toString('hex')));
    await this.put(AuthDbKeys.ORIGIN_ACCOUNTS(origin), Buffer.from(json, 'utf-8'));
  }
}

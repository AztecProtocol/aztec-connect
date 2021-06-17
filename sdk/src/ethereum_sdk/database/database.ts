import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';

export interface DbAccount {
  ethAddress: EthAddress;
  accountPublicKey: GrumpkinAddress;
}

export interface Database {
  init(): Promise<void>;

  clear(): Promise<void>;
  close(): Promise<void>;

  setAccount(account: DbAccount): Promise<void>;
  getAccount(ethAddress: EthAddress): Promise<DbAccount | undefined>;
  deleteAccount(ethAddress: EthAddress): Promise<void>;
}

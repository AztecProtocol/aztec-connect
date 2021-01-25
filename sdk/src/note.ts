import { AssetId } from 'barretenberg/asset';
import { AccountId } from './user';

export interface Note {
  index: number;
  assetId: AssetId;
  value: bigint;
  secret: Buffer;
  dataEntry: Buffer;
  viewingKey: Buffer;
  nullifier: Buffer;
  nullified: boolean;
  owner: AccountId;
}

import { AssetId } from './sdk';
import { UserId } from './user';

export interface Note {
  index: number;
  assetId: AssetId;
  value: bigint;
  dataEntry: Buffer;
  viewingKey: Buffer;
  encrypted: Buffer;
  nullifier: Buffer;
  nullified: boolean;
  owner: UserId;
}

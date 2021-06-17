import { AssetId } from '@aztec/barretenberg/asset';
// import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { AccountId } from './user';

export interface Note {
  index: number;
  assetId: AssetId;
  value: bigint;
  secret: Buffer;
  dataEntry: Buffer;
  // viewingKey: ViewingKey;
  nullifier: Buffer;
  nullified: boolean;
  owner: AccountId;
}

import { AssetId } from '@aztec/barretenberg/asset';
import { AccountId } from './user';

export interface Note {
  index: number;
  assetId: AssetId;
  value: bigint;
  secret: Buffer;
  dataEntry: Buffer;
  nullifier: Buffer;
  nullified: boolean;
  owner: AccountId;
  creatorPubKey: Buffer; // x-coord of note creator public key. Optional, default value 0
}

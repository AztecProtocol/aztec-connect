import { AssetId } from 'barretenberg/client_proofs';
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

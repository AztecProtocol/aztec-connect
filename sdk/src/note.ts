import { AssetId } from '@aztec/barretenberg/asset';
import { AccountId } from './user';

export interface Note {
  assetId: AssetId;
  value: bigint;
  secret: Buffer;
  commitment: Buffer;
  nullifier: Buffer;
  nullified: boolean;
  owner: AccountId;
  creatorPubKey: Buffer; // x-coord of note creator public key. Optional, default value 0
  inputNullifier: Buffer;
  index: number;
  allowChain: boolean;
  pending: boolean;
}

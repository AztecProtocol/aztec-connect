import { GrumpkinAddress } from '@aztec/barretenberg/address';

export * from './recovery_payload';

export interface UserData {
  accountPublicKey: GrumpkinAddress;
  accountPrivateKey: Buffer;
  syncedToRollup: number;
}

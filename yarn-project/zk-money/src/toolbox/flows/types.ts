import type { GrumpkinAddress } from '@aztec/sdk';

export type KeyPair = { privateKey: Buffer; publicKey: GrumpkinAddress };
export type RegistrationKeys = { accountKeys: KeyPair; spendingKeys: KeyPair };

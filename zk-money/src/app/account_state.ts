import type { AccountId } from '@aztec/sdk';

export enum AccountVersion {
  V0 = 0,
  V1 = 1,
  UNKNOWN = -1,
}
export interface AccountState {
  userId: AccountId;
  alias: string;
}

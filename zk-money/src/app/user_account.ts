import type { GrumpkinAddress } from '@aztec/sdk';
import type { AccountState } from './account_state';
export class UserAccount {
  private accountState: AccountState;

  constructor(readonly userId: GrumpkinAddress, readonly alias: string) {
    this.accountState = { userId, alias };
  }

  getAccountState() {
    return this.accountState;
  }
}

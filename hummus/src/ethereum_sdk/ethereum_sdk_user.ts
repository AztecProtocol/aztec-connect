import { AccountId, EthAddress } from '@aztec/sdk';
import { EthereumSdk } from '.';

export class EthereumSdkUser {
  constructor(private address: EthAddress, private accountId: AccountId, private sdk: EthereumSdk) {}

  isSynching() {
    return this.sdk.isUserSynching(this.accountId);
  }

  async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.accountId);
  }

  getUserData() {
    return this.sdk.getUserData(this.accountId);
  }

  getBalance(assetId: number) {
    return this.sdk.getBalance(assetId, this.accountId);
  }

  remove() {
    return this.sdk.removeUser(this.address, this.accountId);
  }

  async getPaymentTxs() {
    return this.sdk.getPaymentTxs(this.accountId);
  }

  async getAccountTxs() {
    return this.sdk.getAccountTxs(this.accountId);
  }

  async getNotes() {
    return this.sdk.getNotes(this.accountId);
  }
}

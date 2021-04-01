import { AssetId, EthAddress } from '@aztec/sdk';
import { AccountUtils } from '../account_utils';
import { ValueSubscriber } from './value_subscriber';

export class PendingBalance extends ValueSubscriber {
  constructor(
    private assetId: AssetId,
    private address: EthAddress | undefined,
    private accountUtils: AccountUtils,
    interval: number,
  ) {
    super(interval);
  }

  protected async getValue() {
    if (!this.address) {
      return 0n;
    }

    return this.accountUtils.getPendingBalance(this.assetId, this.address);
  }
}

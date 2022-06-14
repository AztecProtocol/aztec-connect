import { AztecSdk, EthAddress } from '@aztec/sdk';
import { ValueSubscriber } from './value_subscriber';

export class PendingBalance extends ValueSubscriber {
  constructor(
    private assetId: number,
    private address: EthAddress | undefined,
    private sdk: AztecSdk,
    interval: number,
  ) {
    super(interval);
  }

  protected async getValue() {
    if (!this.address) {
      return 0n;
    }

    return this.sdk.getUserPendingFunds(this.assetId, this.address);
  }
}

import { AssetId, EthAddress } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import { ValueSubscriber } from './value_subscriber';

export class PublicBalance extends ValueSubscriber {
  constructor(
    private assetId: AssetId,
    private address: EthAddress | undefined,
    private web3Provider: Web3Provider | undefined,
    interval: number,
  ) {
    super(interval);
  }

  protected async getValue() {
    if (!this.web3Provider) {
      return 0n;
    }

    // TODO - handle token assets
    return BigInt(await this.web3Provider.getBalance(this.address!.toString()));
  }
}

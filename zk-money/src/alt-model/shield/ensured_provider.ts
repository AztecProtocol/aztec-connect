import { EthAddress } from '@aztec/sdk';
import { Provider } from 'app';
import { Network } from 'app/networks';
import { delay } from 'app/util';

export class WalletAccountEnforcer {
  constructor(
    private readonly provider: Provider,
    private readonly enforcedAddress: EthAddress,
    private readonly enforcedNetwork: Network,
    private readonly prompt: (prompt: string) => void,
  ) {}

  async ensure() {
    let isSameAccount = this.provider.account?.equals(this.enforcedAddress);
    let isSameNetwork = this.provider?.network?.chainId === this.enforcedNetwork.chainId;

    while (!isSameAccount || !isSameNetwork) {
      if (!this.provider.account) {
        throw new Error('Wallet disconnected.');
      }

      if (!isSameAccount) {
        const addressStr = this.enforcedAddress.toString();
        const abbreviatedAddress = `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`;
        this.prompt(`Please switch your wallet's account to ${abbreviatedAddress}.`);
      } else {
        this.prompt(`Please switch your wallet's network to ${this.enforcedNetwork.network}...`);
      }

      await delay(1000);
      isSameAccount = this.provider.account?.equals(this.enforcedAddress);
      isSameNetwork = this.provider?.network?.chainId === this.enforcedNetwork.chainId;
    }
  }
}

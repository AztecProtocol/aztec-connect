import { EthAddress } from '@aztec/sdk';
import { Network } from '../../app/networks.js';
import { delay } from '../../app/util/index.js';
import { ActiveSignerObs } from '../defi/defi_form/correct_provider_hooks.js';

export class WalletAccountEnforcer {
  constructor(
    private readonly activeSignerObs: ActiveSignerObs,
    private readonly enforcedAddress: EthAddress,
    private readonly enforcedNetwork: Network,
    private readonly prompt: (prompt: string) => void,
  ) {}

  async ensure() {
    while (true) {
      const signer = this.activeSignerObs.value;
      const activeAddressStr = await signer?.getAddress();
      const enforcedAddressStr = this.enforcedAddress.toString();
      const activeChainId = await signer?.getChainId();
      const isCorrectAccount = !!signer && enforcedAddressStr === activeAddressStr;
      const isCorrectNetwork = this.enforcedNetwork.chainId === activeChainId;
      if (!isCorrectAccount) {
        const abbreviatedAddress = `${enforcedAddressStr.slice(0, 6)}...${enforcedAddressStr.slice(-4)}`;
        this.prompt(`Please switch your wallet's account to ${abbreviatedAddress}.`);
      } else if (!isCorrectNetwork) {
        this.prompt(`Please switch your wallet's network to ${this.enforcedNetwork.network}...`);
      }
      if (isCorrectAccount && isCorrectNetwork) return signer;
      await delay(1000);
    }
  }
}

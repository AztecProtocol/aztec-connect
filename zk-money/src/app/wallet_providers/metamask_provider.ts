import { EthereumProvider } from '@aztec/sdk';
import { WalletProvider } from './wallet_provider';

class MetamaskProvider implements WalletProvider {
  constructor(public ethereumProvider: EthereumProvider) {}

  async connect() {
    await this.ethereumProvider.request({ method: 'eth_requestAccounts' });
  }

  async disconnect() {}
}

export const createMetamaskProvider = () => {
  const provider = window.ethereum;
  return provider?.isMetaMask ? new MetamaskProvider(provider) : undefined;
};

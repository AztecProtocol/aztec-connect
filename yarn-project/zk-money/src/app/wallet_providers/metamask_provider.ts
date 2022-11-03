import { EthereumProvider } from '@aztec/sdk';
import { WalletProvider } from './wallet_provider.js';

class MetamaskProvider implements WalletProvider {
  constructor(public ethereumProvider: EthereumProvider) {}

  get connected() {
    // `selectedAddress` doesn't exist on wagmi's `Ethereum` type declaration.
    return !!(window as any).ethereum?.selectedAddress;
  }

  async connect() {
    await this.ethereumProvider.request({ method: 'eth_requestAccounts' });
  }

  async disconnect() {}
}

export const createMetamaskProvider = () => {
  const provider = window.ethereum;
  return provider?.isMetaMask ? new MetamaskProvider(provider as unknown as EthereumProvider) : undefined;
};

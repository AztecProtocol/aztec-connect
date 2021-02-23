import { EthereumProvider } from '@aztec/sdk';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { WalletProvider } from './wallet_provider';

class WalletconnectProvider implements WalletProvider {
  public ethereumProvider: EthereumProvider;

  constructor(private provider: WalletConnectProvider) {
    this.ethereumProvider = provider as any;
  }

  async connect() {
    await this.provider.enable();
  }

  async disconnect() {
    // Calling `disconnect` or `close` will option modal again.
    // https://github.com/WalletConnect/walletconnect-monorepo/issues/436
    // await this.provider.disconnect();
    localStorage.removeItem('walletconnect');
  }
}

export const createWalletconnectProvider = (infuraId?: string, ethereumHost = '') => {
  const provider = new WalletConnectProvider({
    infuraId,
    rpc: {
      1: ethereumHost,
      5: ethereumHost,
      1337: ethereumHost,
    },
  });
  return new WalletconnectProvider(provider);
};

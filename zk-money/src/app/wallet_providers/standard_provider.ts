import { EthereumProvider } from '@aztec/sdk';
import { WalletProvider } from './wallet_provider';

class StandardProvider implements WalletProvider {
  constructor(public ethereumProvider: EthereumProvider) {}

  async connect() {}

  async disconnect() {}
}

export const createStandardProvider = (ethereumProvider: EthereumProvider) => {
  return new StandardProvider(ethereumProvider);
};

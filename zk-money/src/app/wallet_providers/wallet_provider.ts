import { EthereumProvider } from '@aztec/sdk';

export interface WalletProvider {
  ethereumProvider: EthereumProvider;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

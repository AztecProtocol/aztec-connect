import { EthereumProvider } from '@aztec/sdk';

export interface WalletProvider {
  ethereumProvider: EthereumProvider;
  connected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

import createDebug from 'debug';
import { createMetamaskProvider } from './metamask_provider.js';
import { createStandardProvider } from './standard_provider.js';
import { createWalletconnectProvider } from './walletconnect_provider.js';
import { WalletId } from './wallets.js';
import { JsonRpcProvider } from '@aztec/sdk';

export * from './wallets.js';
export * from './wallet_provider.js';

const debug = createDebug('zm:wallet_provider');

export interface ProviderConfig {
  chainId: number;
  ethereumHost: string;
}

export const createWalletProvider = (walletId: WalletId, { chainId, ethereumHost }: ProviderConfig) => {
  switch (walletId) {
    case WalletId.METAMASK:
      return createMetamaskProvider();
    case WalletId.CONNECT:
      return createWalletconnectProvider(chainId, ethereumHost);
    default:
  }
  debug(`Create provider with ethereum host: ${ethereumHost}`);
  return createStandardProvider(new JsonRpcProvider(ethereumHost));
};

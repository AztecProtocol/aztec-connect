import { InfuraProvider, JsonRpcProvider } from '@ethersproject/providers';
import createDebug from 'debug';
import { EthersAdapter } from './ethers_adapter';
import { createMetamaskProvider } from './metamask_provider';
import { createStandardProvider } from './standard_provider';
import { createWalletconnectProvider } from './walletconnect_provider';
import { WalletId } from './wallets';

export * from './wallets';
export * from './wallet_provider';

const debug = createDebug('zm:wallet_provider');

export interface ProviderConfig {
  infuraId: string;
  ethereumHost: string;
  network: string;
}

export const createWalletProvider = (walletId: WalletId, { infuraId, ethereumHost, network }: ProviderConfig) => {
  switch (walletId) {
    case WalletId.METAMASK:
      return createMetamaskProvider();
    case WalletId.CONNECT:
      return createWalletconnectProvider(infuraId);
    default:
  }
  if (infuraId && network && network !== 'ganache') {
    debug(`Create provider with infura network: ${network}`);
    return createStandardProvider(new EthersAdapter(new InfuraProvider(network, infuraId)));
  }
  if (ethereumHost) {
    debug(`Create provider with ethereum host: ${ethereumHost}`);
    return createStandardProvider(new EthersAdapter(new JsonRpcProvider(ethereumHost)));
  }
  throw new Error('Provider is undefined.');
};

import { EthAddress } from '@aztec/sdk';
import { EventEmitter } from 'events';

export interface Network {
  chainId: number;
  network: string;
}

export const ganache: Network = { chainId: Number.NaN, network: 'Ganache' };

export const networks: Network[] = [
  { chainId: 1, network: 'Mainnet' },
  { chainId: 3, network: 'Ropsten' },
  { chainId: 4, network: 'Rinkeby' },
  { chainId: 5, network: 'Goerli' },
  { chainId: 42, network: 'Kovan' },
  ganache,
];

export const chainIdToNetwork = (chainId: number) => {
  return networks.find(network => network.chainId === chainId) || ganache;
};

export enum EthProviderEvent {
  UPDATED_ACCESS_STATE = 'UPDATED_ACCESS_STATE',
  UPDATED_NETWORK = 'UPDATED_NETWORK',
  UPDATED_ACCOUNTS = 'UPDATED_ACCOUNTS',
  UPDATED_ACCOUNT = 'UPDATED_ACCOUNT',
}

export enum EthProviderAccessState {
  APPROVING = 'Approving',
  APPROVED = 'Approved',
  UNAPPROVED = 'Unapproved',
}

export interface EthProvider extends EventEmitter {
  destroy(): void;

  requestAccess(): Promise<void>;

  getAccessState(): EthProviderAccessState;

  getChainId(): number;

  getNetwork(): Network;

  getAccounts(): EthAddress[];

  getAccount(): EthAddress | undefined;

  getBalance(address: EthAddress): Promise<bigint>;
}

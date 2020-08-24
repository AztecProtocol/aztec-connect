import { EventEmitter } from 'events';
import { EthAddress } from 'barretenberg/address';

export * from './eth_provider';

export enum EthProviderEvent {
  UPDATED_NETWORK = 'UPDATED_NETWORK',
  UPDATED_ACCOUNT = 'UPDATED_ACCOUNT',
}

export interface EthProvider extends EventEmitter {
  init(): Promise<void>;

  destroy(): void;

  getChainId(): number;

  getNetwork(): string;

  getAccounts(): EthAddress[];

  getAccount(): EthAddress;
}

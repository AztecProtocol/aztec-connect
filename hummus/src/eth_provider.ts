import { EventEmitter } from 'events';

export interface Network {
  chainId: number;
  network: string;
}

const ganache: Network = { chainId: Number.NaN, network: 'ganache' };

export const networks: Network[] = [
  { chainId: 1, network: 'mainnet' },
  { chainId: 3, network: 'ropsten' },
  { chainId: 4, network: 'rinkeby' },
  { chainId: 5, network: 'goerli' },
  { chainId: 42, network: 'kovan' },
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

export class EthProvider extends EventEmitter {
  private accessState = EthProviderAccessState.UNAPPROVED;

  constructor(private provider: any) {
    super();

    this.provider.autoRefreshOnNetworkChange = false;

    this.provider.on('chainChanged', this.updateNetwork);
    this.provider.on('accountsChanged', this.updateAccounts);
  }

  public destroy() {
    this.provider.off('chainChanged', this.updateNetwork);
    this.provider.off('accountsChanged', this.updateAccounts);
  }

  public async requestAccess(callback?: () => Promise<void>) {
    try {
      this.updateAccessState(EthProviderAccessState.APPROVING);
      await this.provider.enable();
      if (callback) {
        await callback();
      }
      this.updateAccessState(EthProviderAccessState.APPROVED);
    } catch (error) {
      this.updateAccessState(EthProviderAccessState.UNAPPROVED);
    }
  }

  private updateAccessState(state: EthProviderAccessState) {
    this.accessState = state;
    this.emit(EthProviderEvent.UPDATED_ACCESS_STATE, state);
  }

  private updateNetwork = (chainId: string) => {
    const network = chainIdToNetwork(parseInt(chainId, 16));
    this.emit(EthProviderEvent.UPDATED_NETWORK, network);
  };

  private updateAccounts = (accounts: string[]) => {
    if (!accounts.length) {
      this.updateAccessState(EthProviderAccessState.UNAPPROVED);
    }

    this.emit(EthProviderEvent.UPDATED_ACCOUNTS, accounts);
    this.emit(EthProviderEvent.UPDATED_ACCOUNT, accounts[0] || '');
  };

  public getAccessState() {
    return this.accessState;
  }

  public getChainId() {
    return parseInt(this.provider.chainId, 16);
  }

  public getNetwork() {
    return chainIdToNetwork(parseInt(this.provider.chainId, 16));
  }

  public getAccounts() {
    const { selectedAddress } = this.provider;
    return selectedAddress ? [selectedAddress] : [];
  }

  public getAccount() {
    return this.provider.selectedAddress || '';
  }
}

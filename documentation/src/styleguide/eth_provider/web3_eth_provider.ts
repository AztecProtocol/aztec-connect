import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { EthProvider, EthProviderEvent, EthProviderAccessState, chainIdToNetwork } from './eth_provider';

export class Web3EthProvider extends EventEmitter implements EthProvider {
  private ethersProvider: Web3Provider;
  private accessState = EthProviderAccessState.UNAPPROVED;
  private accounts: EthAddress[] = [];

  constructor(private provider: any) {
    super();

    this.provider.autoRefreshOnNetworkChange = false;

    this.ethersProvider = new Web3Provider(provider);

    this.provider.on('chainChanged', this.updateNetwork);
    this.provider.on('accountsChanged', this.updateAccounts);

    if (provider.selectedAddress) {
      this.updateAccounts([provider.selectedAddress]);
    }
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

    this.accounts = accounts.map(EthAddress.fromString);
    this.emit(EthProviderEvent.UPDATED_ACCOUNTS, this.accounts);
    this.emit(EthProviderEvent.UPDATED_ACCOUNT, this.accounts[0]);
  };

  public getAccessState() {
    return this.accessState;
  }

  public getChainId() {
    return parseInt(this.provider.chainId, 16);
  }

  public getNetwork() {
    return chainIdToNetwork(this.getChainId());
  }

  public getAccounts() {
    return this.accounts;
  }

  public getAccount() {
    return this.accounts[0];
  }

  public async getBalance(address: EthAddress) {
    const balance = await this.ethersProvider.getBalance(address.toString());
    return BigInt(balance.toString());
  }
}

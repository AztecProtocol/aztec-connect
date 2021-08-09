import { EventEmitter } from 'events';
import createDebug from 'debug';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';

const debug = createDebug('bb:eth_provider');

export enum EthProviderEvent {
  UPDATED_NETWORK = 'UPDATED_NETWORK',
  UPDATED_ACCOUNT = 'UPDATED_ACCOUNT',
}

interface Network {
  chainId: number;
  network: string;
}

export const networks: Network[] = [
  { chainId: 1, network: 'mainnet' },
  { chainId: 3, network: 'ropsten' },
  { chainId: 4, network: 'rinkeby' },
  { chainId: 5, network: 'goerli' },
  { chainId: 42, network: 'kovan' },
  { chainId: 1337, network: 'ganache' },
];

export const chainIdToNetwork = (chainId: number) => {
  return networks.find(network => network.chainId === chainId)?.network || 'unknown';
};

export class EthProvider extends EventEmitter {
  private chainId = -1;
  private accounts: EthAddress[] = [];

  constructor(private provider: EthereumProvider) {
    super();
  }

  public async init() {
    const ethersProvider = new Web3Provider(this.provider);
    await this.provider.request({ method: 'eth_requestAccounts' });

    await this.updateNetwork();

    const accounts = await ethersProvider.listAccounts();
    this.updateAccounts(accounts);

    this.provider.on('chainChanged', this.updateNetwork);
    this.provider.on('accountsChanged', this.updateAccounts);

    return this.getAccount();
  }

  public destroy() {
    this.provider.removeListener('chainChanged', this.updateNetwork);
    this.provider.removeListener('accountsChanged', this.updateAccounts);
    this.removeAllListeners();
  }

  private updateNetwork = async () => {
    const ethersProvider = new Web3Provider(this.provider);
    this.chainId = (await ethersProvider.getNetwork()).chainId;
    const network = chainIdToNetwork(this.chainId);
    debug(`chainId set to: ${this.chainId}`);
    this.emit(EthProviderEvent.UPDATED_NETWORK, network, this.chainId);
  };

  private updateAccounts = (accounts: string[]) => {
    this.accounts = accounts.map(EthAddress.fromString);
    this.emit(EthProviderEvent.UPDATED_ACCOUNT, this.accounts[0]);
  };

  public getChainId() {
    return this.chainId;
  }

  public getNetwork() {
    return chainIdToNetwork(this.getChainId());
  }

  public getAccounts() {
    return this.accounts;
  }

  public getAccount(): EthAddress | undefined {
    return this.accounts[0];
  }
}

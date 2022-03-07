import { EthAddress } from '../address';
import { EthereumProvider } from './ethereum_provider';

export class EthereumRpc {
  constructor(private provider: EthereumProvider) {}

  public async getChainId() {
    const result = await this.provider.request({ method: 'eth_chainId' });
    return Number(result);
  }

  public async getAccounts() {
    const result = await this.provider.request({ method: 'eth_accounts' });
    return result.map(EthAddress.fromString);
  }
}

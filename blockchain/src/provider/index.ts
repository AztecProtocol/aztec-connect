import { EthersAdapter } from './ethers_adapter';
import { JsonRpcProvider as JRP } from '@ethersproject/providers';
import { EthAddress } from '@aztec/barretenberg/address';

export * from './ethers_adapter';
export * from './wallet_provider';
export * from './web3_adapter';
export * from './web3_provider';

export class JsonRpcProvider extends EthersAdapter {
  private ethersProvider: JRP;

  constructor(host: string) {
    const jrp = new JRP(host);
    super(jrp);
    this.ethersProvider = jrp;
  }

  async getAccounts() {
    return (await this.ethersProvider.listAccounts()).map(a => EthAddress.fromString(a));
  }
}

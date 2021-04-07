import { EthersAdapter } from './ethers_adapter';
import { JsonRpcProvider as JRP } from '@ethersproject/providers';

export * from './ethereum_provider';
export * from './ethers_adapter';
export * from './wallet_provider';
export * from './web3_adapter';
export * from './web3_provider';

export class JsonRpcProvider extends EthersAdapter {
  constructor(host: string) {
    super(new JRP(host));
  }
}

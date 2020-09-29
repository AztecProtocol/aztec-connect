import { EthAddress } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { EthProvider, ganache, EthProviderAccessState } from './eth_provider';

export class MockEthProvider extends EventEmitter implements EthProvider {
  destroy() {}

  async requestAccess() {}

  getAccessState() {
    return EthProviderAccessState.APPROVED;
  }

  getChainId() {
    return 0;
  }

  getNetwork() {
    return ganache;
  }

  getAccounts() {
    return [];
  }

  getAccount() {
    return undefined;
  }

  async getBalance(address: EthAddress) {
    return BigInt(0);
  }
}

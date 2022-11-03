import { AddressCheckProvider } from './address_check_provider.js';
import { EthAddress } from '@aztec/barretenberg/address';

export class AztecBlacklistProvider implements AddressCheckProvider {
  constructor(private blacklist: EthAddress[]) {}

  addressProhibited(address: EthAddress): Promise<boolean> {
    return Promise.resolve(this.blacklist.some(x => x.equals(address)));
  }

  configureNewAddresses(newBlacklist: EthAddress[]) {
    this.blacklist = newBlacklist;
  }
}

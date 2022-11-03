import { EthAddress } from '@aztec/barretenberg/address';

export interface AddressCheckProvider {
  addressProhibited(address: EthAddress): Promise<boolean>;
}

export class AddressCheckProviders implements AddressCheckProvider {
  private providers: AddressCheckProvider[] = [];

  addProvider(provider: AddressCheckProvider) {
    this.providers.push(provider);
  }

  async addressProhibited(address: EthAddress): Promise<boolean> {
    const results = await Promise.all(this.providers.map(provider => provider.addressProhibited(address)));
    return results.includes(true);
  }
}

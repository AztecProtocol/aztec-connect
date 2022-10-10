import { EthAddress } from '@aztec/barretenberg/address';
import { AddressCheckProviders } from './address_check_provider.js';
import { AztecBlacklistProvider } from './aztec_blacklist_provider.js';
import { jest } from '@jest/globals';

describe('Address Check Providers', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('can be constructed', () => {
    expect(() => new AddressCheckProviders()).not.toThrow();
  });

  it('returns false if address is not blacklisted by any provider', async () => {
    const initialAddresses1 = [EthAddress.random(), EthAddress.random()];
    const provider1 = new AztecBlacklistProvider(initialAddresses1);
    const initialAddresses2 = [EthAddress.random(), EthAddress.random()];
    const provider2 = new AztecBlacklistProvider(initialAddresses2);
    const addressCheckProviders = new AddressCheckProviders();
    addressCheckProviders.addProvider(provider1);
    addressCheckProviders.addProvider(provider2);
    const newAddress = EthAddress.random();
    // new address is not blacklisted
    expect(await addressCheckProviders.addressProhibited(newAddress)).toEqual(false);
  });

  it('returns true if address is blacklisted by any provider', async () => {
    const initialAddresses1 = [EthAddress.random(), EthAddress.random()];
    const provider1 = new AztecBlacklistProvider(initialAddresses1);
    const initialAddresses2 = [EthAddress.random(), EthAddress.random()];
    const provider2 = new AztecBlacklistProvider(initialAddresses2);
    const addressCheckProviders = new AddressCheckProviders();
    addressCheckProviders.addProvider(provider1);
    addressCheckProviders.addProvider(provider2);

    // address is blocked by first provider
    expect(await addressCheckProviders.addressProhibited(initialAddresses1[0])).toEqual(true);
    // address is blocked by second provider
    expect(await addressCheckProviders.addressProhibited(initialAddresses2[0])).toEqual(true);
  });

  it('returns true if address is blacklisted by new provider', async () => {
    const initialAddresses1 = [EthAddress.random(), EthAddress.random()];
    const provider1 = new AztecBlacklistProvider(initialAddresses1);
    const initialAddresses2 = [EthAddress.random(), EthAddress.random()];
    const provider2 = new AztecBlacklistProvider(initialAddresses2);
    const addressCheckProviders = new AddressCheckProviders();
    addressCheckProviders.addProvider(provider1);
    addressCheckProviders.addProvider(provider2);

    // address is blocked by first provider
    expect(await addressCheckProviders.addressProhibited(initialAddresses1[0])).toEqual(true);
    // address is blocked by second provider
    expect(await addressCheckProviders.addressProhibited(initialAddresses2[0])).toEqual(true);

    const initialAddresses3 = [EthAddress.random(), EthAddress.random()];
    const provider3 = new AztecBlacklistProvider(initialAddresses3);

    // check the 3rd addresses, they should be allowed
    expect(await addressCheckProviders.addressProhibited(initialAddresses3[0])).toEqual(false);
    expect(await addressCheckProviders.addressProhibited(initialAddresses3[1])).toEqual(false);

    // add the 3rd provider in
    addressCheckProviders.addProvider(provider3);

    // check the 3rd addresses again, they should now not be allowed
    expect(await addressCheckProviders.addressProhibited(initialAddresses3[0])).toEqual(true);
    expect(await addressCheckProviders.addressProhibited(initialAddresses3[1])).toEqual(true);
  });

  it('can be configured with a new set of addresses', async () => {
    const initialAddresses1 = [EthAddress.random(), EthAddress.random()];
    const provider1 = new AztecBlacklistProvider(initialAddresses1);
    const initialAddresses2 = [EthAddress.random(), EthAddress.random()];
    const provider2 = new AztecBlacklistProvider(initialAddresses2);
    const addressCheckProviders = new AddressCheckProviders();
    addressCheckProviders.addProvider(provider1);
    addressCheckProviders.addProvider(provider2);

    const additionalAddress = EthAddress.random();

    // initial addresses for all providers are all blacklisted
    expect(await addressCheckProviders.addressProhibited(initialAddresses1[0])).toEqual(true);
    expect(await addressCheckProviders.addressProhibited(initialAddresses1[1])).toEqual(true);
    expect(await addressCheckProviders.addressProhibited(initialAddresses2[0])).toEqual(true);
    expect(await addressCheckProviders.addressProhibited(initialAddresses2[1])).toEqual(true);

    // additional address is not blacklisted
    expect(await addressCheckProviders.addressProhibited(additionalAddress)).toEqual(false);

    // reconfigure one of the providers
    const newAddresses = [EthAddress.random(), EthAddress.random(), EthAddress.random()];

    provider2.configureNewAddresses(newAddresses);

    // recheck initial sets of addresses
    expect(await addressCheckProviders.addressProhibited(initialAddresses1[0])).toEqual(true);
    expect(await addressCheckProviders.addressProhibited(initialAddresses1[1])).toEqual(true);
    expect(await addressCheckProviders.addressProhibited(initialAddresses2[0])).toEqual(false);
    expect(await addressCheckProviders.addressProhibited(initialAddresses2[1])).toEqual(false);
    expect(await addressCheckProviders.addressProhibited(newAddresses[0])).toEqual(true);
    expect(await addressCheckProviders.addressProhibited(newAddresses[1])).toEqual(true);
    expect(await addressCheckProviders.addressProhibited(newAddresses[2])).toEqual(true);
  });
});

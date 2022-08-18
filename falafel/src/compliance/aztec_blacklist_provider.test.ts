import { EthAddress } from '@aztec/barretenberg/address';
import { AztecBlacklistProvider } from './aztec_blacklist_provider';

describe('Aztec Blacklist Provider', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('can be constructed', () => {
    const initialAddresses = [EthAddress.random(), EthAddress.random()];
    expect(() => new AztecBlacklistProvider(initialAddresses)).not.toThrow();
  });

  it('returns false if address is not blacklisted', async () => {
    const initialAddresses = [EthAddress.random(), EthAddress.random()];
    const provider = new AztecBlacklistProvider(initialAddresses);
    const newAddress = EthAddress.random();
    // new address is not blacklisted
    expect(await provider.addressProhibited(newAddress)).toEqual(false);
  });

  it('returns true if address is blacklisted', async () => {
    const initialAddresses = [EthAddress.random(), EthAddress.random()];
    const provider = new AztecBlacklistProvider(initialAddresses);
    // all initial addresses are blacklisted
    expect(await provider.addressProhibited(initialAddresses[0])).toEqual(true);
    expect(await provider.addressProhibited(initialAddresses[1])).toEqual(true);
  });

  it('can be configured with a new set of addresses', async () => {
    const initialAddresses = [EthAddress.random(), EthAddress.random()];
    const provider = new AztecBlacklistProvider(initialAddresses);
    const newAddresses = [EthAddress.random(), EthAddress.random(), EthAddress.random()];
    const additionalAddress = EthAddress.random();

    // initial addresses are blacklisted
    expect(await provider.addressProhibited(initialAddresses[0])).toEqual(true);
    expect(await provider.addressProhibited(initialAddresses[1])).toEqual(true);

    // new addresses are not blacklisted
    expect(await provider.addressProhibited(newAddresses[0])).toEqual(false);
    expect(await provider.addressProhibited(newAddresses[1])).toEqual(false);
    expect(await provider.addressProhibited(newAddresses[2])).toEqual(false);

    // additional address is not blacklisted
    expect(await provider.addressProhibited(additionalAddress)).toEqual(false);

    // set the new blacklist
    provider.configureNewAddresses(newAddresses);

    // initial addresses are no longer blacklisted
    expect(await provider.addressProhibited(initialAddresses[0])).toEqual(false);
    expect(await provider.addressProhibited(initialAddresses[1])).toEqual(false);

    // new addresses are blacklisted
    expect(await provider.addressProhibited(newAddresses[0])).toEqual(true);
    expect(await provider.addressProhibited(newAddresses[1])).toEqual(true);
    expect(await provider.addressProhibited(newAddresses[2])).toEqual(true);

    // additional address is not blacklisted
    expect(await provider.addressProhibited(additionalAddress)).toEqual(false);
  });
});

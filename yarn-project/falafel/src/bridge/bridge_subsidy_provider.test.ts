import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';
import { BridgeResolver } from './bridge_resolver';
import { BridgeSubsidyProvider } from './bridge_subsidy_provider';
import { jest } from '@jest/globals';
import { BridgeSubsidy } from '@aztec/barretenberg/blockchain';

const bridgeConfigs: BridgeConfig[] = [
  {
    bridgeAddressId: 1,
    numTxs: 5,
    gas: 500000,
    permittedAssets: [0, 1],
  },
  {
    bridgeAddressId: 2,
    numTxs: 10,
    gas: 0,
    permittedAssets: [1, 2],
  },
];

const createBridgeCallData = (bridgeConfig: BridgeConfig, assetIndices: number[]) => {
  return new BridgeCallData(
    bridgeConfig.bridgeAddressId,
    bridgeConfig.permittedAssets[assetIndices[0]],
    bridgeConfig.permittedAssets[assetIndices[1]],
    undefined,
    undefined,
    0,
  );
};

const bridgeCallDatas = [
  createBridgeCallData(bridgeConfigs[0], [0, 1]),
  createBridgeCallData(bridgeConfigs[0], [1, 0]),
  createBridgeCallData(bridgeConfigs[1], [0, 1]),
  createBridgeCallData(bridgeConfigs[1], [1, 0]),
];

const bridgeSubsidyMappings = new Map<string, BridgeSubsidy>([
  [bridgeCallDatas[0].toString(), { addressId: 1, criteria: 5n, subsidyInGas: 50000, subsidyInWei: 100000n }],
  [bridgeCallDatas[1].toString(), { addressId: 1, criteria: 6n, subsidyInGas: 175000, subsidyInWei: 100000n }],
  [bridgeCallDatas[2].toString(), { addressId: 2, criteria: 6n, subsidyInGas: 50000, subsidyInWei: 100000n }],
  [bridgeCallDatas[3].toString(), { addressId: 2, criteria: 6n, subsidyInGas: 50000, subsidyInWei: 100000n }],
]);

type Mockify<T> = {
  [P in keyof T]: ReturnType<typeof jest.fn>;
};

describe('Bridge Subsidy Provider', () => {
  const bridgeResolver: Mockify<BridgeResolver> = {
    getBridgeSubsidy: jest.fn((bridgeCallData: bigint) => {
      const fullCallData = BridgeCallData.fromBigInt(bridgeCallData);
      const subsidy = bridgeSubsidyMappings.get(fullCallData.toString());
      return Promise.resolve(subsidy);
    }),
  } as any;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should return zero subsidy for unrecognised bridge', async () => {
    const bridgeSubsidyProvider = new BridgeSubsidyProvider(bridgeResolver as any);
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(new BridgeCallData(5, 0, 0, 0, 0, 1).toBigInt())).toEqual(0);
  });

  it('should return correct subsidy for recognised bridge', async () => {
    const bridgeSubsidyProvider = new BridgeSubsidyProvider(bridgeResolver as any);
    for (const bridgeCallData of bridgeCallDatas) {
      expect(await bridgeSubsidyProvider.getBridgeSubsidy(bridgeCallData.toBigInt())).toEqual(
        bridgeSubsidyMappings.get(bridgeCallData.toString())?.subsidyInGas,
      );
    }
  });

  it('should no longer return subsidy for same bridge address id and criteria once claimed', async () => {
    const bridgeSubsidyProvider = new BridgeSubsidyProvider(bridgeResolver as any);
    // the following bridge call datas should have the same subsidy as they are the same bridge id and criteria
    const expectedSubsidy = bridgeSubsidyMappings.get(bridgeCallDatas[2].toString())?.subsidyInGas;
    const firstBridgeCallData = bridgeCallDatas[2];
    const secondBridgeCallData = bridgeCallDatas[3];
    // the bridge subsidy should be returned for both bridges
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(firstBridgeCallData.toBigInt())).toEqual(expectedSubsidy);
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(secondBridgeCallData.toBigInt())).toEqual(expectedSubsidy);
    // claiming for the first bridge should succeed
    expect(bridgeSubsidyProvider.claimBridgeSubsidy(firstBridgeCallData.toBigInt())).toEqual(true);
    // the same call should still rteurn true
    expect(bridgeSubsidyProvider.claimBridgeSubsidy(firstBridgeCallData.toBigInt())).toEqual(true);
    // attempting to claim for the second bridge should fail
    expect(bridgeSubsidyProvider.claimBridgeSubsidy(secondBridgeCallData.toBigInt())).toEqual(false);
    // the bridge subsidy should now be 0 for both bridges
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(secondBridgeCallData.toBigInt())).toEqual(0);
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(firstBridgeCallData.toBigInt())).toEqual(0);

    // subsidy for other bridge is not affected
    const expectedSubsidy2 = bridgeSubsidyMappings.get(bridgeCallDatas[0].toString())?.subsidyInGas;
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(bridgeCallDatas[0].toBigInt())).toEqual(expectedSubsidy2);
  });

  it('should return claimed subsidy', async () => {
    const bridgeSubsidyProvider = new BridgeSubsidyProvider(bridgeResolver as any);
    const firstBridgeCallData = bridgeCallDatas[2];
    const secondBridgeCallData = bridgeCallDatas[3];
    const thirdBridgeCallData = bridgeCallDatas[0];
    const expectedSubsidy1 = bridgeSubsidyMappings.get(firstBridgeCallData.toString())?.subsidyInGas;
    const expectedSubsidy2 = bridgeSubsidyMappings.get(thirdBridgeCallData.toString())?.subsidyInGas;
    // the bridge subsidy should be returned for both bridges
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(firstBridgeCallData.toBigInt())).toEqual(expectedSubsidy1);
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(secondBridgeCallData.toBigInt())).toEqual(expectedSubsidy1);
    expect(await bridgeSubsidyProvider.getBridgeSubsidy(thirdBridgeCallData.toBigInt())).toEqual(expectedSubsidy2);
    // claiming for the first bridge should succeed
    expect(bridgeSubsidyProvider.claimBridgeSubsidy(firstBridgeCallData.toBigInt())).toEqual(true);
    // attempting to claim for the second bridge should fail
    expect(bridgeSubsidyProvider.claimBridgeSubsidy(secondBridgeCallData.toBigInt())).toEqual(false);
    // claiming for the third bridge should succeed
    expect(bridgeSubsidyProvider.claimBridgeSubsidy(thirdBridgeCallData.toBigInt())).toEqual(true);
    // check the claimed subsidy values
    expect(bridgeSubsidyProvider.getClaimedSubsidy(firstBridgeCallData.toBigInt())).toEqual(expectedSubsidy1);
    expect(bridgeSubsidyProvider.getClaimedSubsidy(secondBridgeCallData.toBigInt())).toEqual(0);
    expect(bridgeSubsidyProvider.getClaimedSubsidy(thirdBridgeCallData.toBigInt())).toEqual(expectedSubsidy2);
  });
});

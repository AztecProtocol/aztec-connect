import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { JsonRpcProvider } from '../../index.js';
import { BridgeDataProvider } from './bridge_data_provider.js';
import { jest } from '@jest/globals';

const toNumber = (value: number) => {
  return {
    toNumber: () => value,
  };
};

const toBigInt = (value: bigint) => {
  return {
    toBigInt: () => value,
  };
};

const bridgeDatas: {
  [key: number]: {
    bridgeAddress: string;
    bridgeAddressId: { toNumber: () => number };
    label: string;
  };
} = {
  1: {
    bridgeAddress: EthAddress.random().toString(),
    bridgeAddressId: toNumber(1),
    label: 'Bridge 1',
  },
  2: {
    bridgeAddress: EthAddress.random().toString(),
    bridgeAddressId: toNumber(2),
    label: 'Bridge 2',
  },
};

const bridgeCallData1 = new BridgeCallData(1, 0, 0, 0, 0);
const bridgeCallData2 = new BridgeCallData(2, 0, 0, 0, 0);

const subsidies: {
  [key: string]: {
    subsidy: { toNumber: () => number };
    criteria: { toBigInt: () => bigint };
    eth: { toBigInt: () => bigint };
  };
} = {};

describe('bridge_data_provider', () => {
  const mockContract = {
    getBridge: jest.fn<any>().mockImplementation((id: number) => {
      return Promise.resolve(bridgeDatas[id]);
    }),
    getAccumulatedSubsidyAmount: jest.fn<any>().mockImplementation((bridgeCallData: bigint) => {
      const sub = subsidies[BridgeCallData.fromBigInt(bridgeCallData).toString()];
      return Promise.resolve([sub.criteria, sub.eth, sub.subsidy]);
    }),
  } as any;

  const createBridgeDataProvider = () => {
    const provider = new JsonRpcProvider('test');
    const bridgeDataProvider = new BridgeDataProvider(EthAddress.random(), provider, () => {
      return mockContract;
    });
    return bridgeDataProvider;
  };

  beforeEach(() => {
    subsidies[bridgeCallData1.toString()] = {
      subsidy: toNumber(50000),
      criteria: toBigInt(1n),
      eth: toBigInt(100000n),
    };
    subsidies[bridgeCallData2.toString()] = {
      subsidy: toNumber(150000),
      criteria: toBigInt(2n),
      eth: toBigInt(200000n),
    };
    mockContract.getBridge.mockClear();
    mockContract.getAccumulatedSubsidyAmount.mockClear();
  });

  it('bridge data provider returns correct bridge data', async () => {
    const bridgeDataProvider = createBridgeDataProvider();
    const bridgeData1 = await bridgeDataProvider.getBridgeData(1);
    expect(bridgeData1).toMatchObject({
      address: EthAddress.fromString(bridgeDatas[1].bridgeAddress),
      addressId: bridgeDatas[1].bridgeAddressId.toNumber(),
      description: bridgeDatas[1].label,
    });
    const bridgeData2 = await bridgeDataProvider.getBridgeData(2);
    expect(bridgeData2).toMatchObject({
      address: EthAddress.fromString(bridgeDatas[2].bridgeAddress),
      addressId: bridgeDatas[2].bridgeAddressId.toNumber(),
      description: bridgeDatas[2].label,
    });
  });

  it('bridge data provider returns correct subsidy', async () => {
    const bridgeDataProvider = createBridgeDataProvider();
    const subsidy1 = await bridgeDataProvider.getBridgeSubsidy(bridgeCallData1.toBigInt());
    expect(subsidy1).toMatchObject({
      subsidyInGas: 50000,
      subsidyInWei: 100000n,
      criteria: 1n,
    });
    const subsidy2 = await bridgeDataProvider.getBridgeSubsidy(bridgeCallData2.toBigInt());
    expect(subsidy2).toMatchObject({
      subsidyInGas: 150000,
      subsidyInWei: 200000n,
      criteria: 2n,
    });
  });

  it('bridge data provider caches returned subsidy for a given bridge call data', async () => {
    const bridgeDataProvider = createBridgeDataProvider();

    for (let i = 0; i < 5; i++) {
      const subsidy1 = await bridgeDataProvider.getBridgeSubsidy(bridgeCallData1.toBigInt());
      expect(subsidy1).toMatchObject({
        subsidyInGas: 50000,
        subsidyInWei: 100000n,
        criteria: 1n,
      });
    }
    // should have only called the contract once
    expect(mockContract.getAccumulatedSubsidyAmount).toBeCalledTimes(1);
    for (let i = 0; i < 5; i++) {
      const subsidy2 = await bridgeDataProvider.getBridgeSubsidy(bridgeCallData2.toBigInt());
      expect(subsidy2).toMatchObject({
        subsidyInGas: 150000,
        subsidyInWei: 200000n,
        criteria: 2n,
      });
    }
    // should have only called the contract once more
    expect(mockContract.getAccumulatedSubsidyAmount).toBeCalledTimes(2);
  });

  it('bridge data provider subsidy cache is cleared upon request', async () => {
    const bridgeDataProvider = createBridgeDataProvider();

    expect(await bridgeDataProvider.getBridgeSubsidy(bridgeCallData1.toBigInt())).toMatchObject({
      subsidyInGas: 50000,
      subsidyInWei: 100000n,
      criteria: 1n,
    });
    expect(mockContract.getAccumulatedSubsidyAmount).toBeCalledTimes(1);
    expect(await bridgeDataProvider.getBridgeSubsidy(bridgeCallData2.toBigInt())).toMatchObject({
      subsidyInGas: 150000,
      subsidyInWei: 200000n,
      criteria: 2n,
    });
    expect(mockContract.getAccumulatedSubsidyAmount).toBeCalledTimes(2);

    // set new subsidy values
    subsidies[bridgeCallData1.toString()] = {
      subsidy: toNumber(340000),
      criteria: toBigInt(1n),
      eth: toBigInt(100000n),
    };
    subsidies[bridgeCallData2.toString()] = {
      subsidy: toNumber(268000),
      criteria: toBigInt(2n),
      eth: toBigInt(200000n),
    };

    // values are still cached from previously
    expect(await bridgeDataProvider.getBridgeSubsidy(bridgeCallData1.toBigInt())).toMatchObject({
      subsidyInGas: 50000,
      subsidyInWei: 100000n,
      criteria: 1n,
    });
    expect(mockContract.getAccumulatedSubsidyAmount).toBeCalledTimes(2);
    expect(await bridgeDataProvider.getBridgeSubsidy(bridgeCallData2.toBigInt())).toMatchObject({
      subsidyInGas: 150000,
      subsidyInWei: 200000n,
      criteria: 2n,
    });
    expect(mockContract.getAccumulatedSubsidyAmount).toBeCalledTimes(2);

    // this should clear the cache
    bridgeDataProvider.updatePerEthBlockState();

    // new values should be requested from the contract
    expect(await bridgeDataProvider.getBridgeSubsidy(bridgeCallData1.toBigInt())).toMatchObject({
      subsidyInGas: 340000,
      subsidyInWei: 100000n,
      criteria: 1n,
    });
    expect(mockContract.getAccumulatedSubsidyAmount).toBeCalledTimes(3);
    expect(await bridgeDataProvider.getBridgeSubsidy(bridgeCallData2.toBigInt())).toMatchObject({
      subsidyInGas: 268000,
      subsidyInWei: 200000n,
      criteria: 2n,
    });
    expect(mockContract.getAccumulatedSubsidyAmount).toBeCalledTimes(4);
  });

  it('bridge data provider caches returned bridge data for a given bridge address id', async () => {
    const bridgeDataProvider = createBridgeDataProvider();
    for (let i = 0; i < 5; i++) {
      const bridgeData1 = await bridgeDataProvider.getBridgeData(1);
      expect(bridgeData1).toMatchObject({
        address: EthAddress.fromString(bridgeDatas[1].bridgeAddress),
        addressId: bridgeDatas[1].bridgeAddressId.toNumber(),
        description: bridgeDatas[1].label,
      });
    }
    // should have only been called once
    expect(mockContract.getBridge).toBeCalledTimes(1);

    for (let i = 0; i < 5; i++) {
      const bridgeData1 = await bridgeDataProvider.getBridgeData(2);
      expect(bridgeData1).toMatchObject({
        address: EthAddress.fromString(bridgeDatas[2].bridgeAddress),
        addressId: bridgeDatas[2].bridgeAddressId.toNumber(),
        description: bridgeDatas[2].label,
      });
    }
    // should have only been called once more
    expect(mockContract.getBridge).toBeCalledTimes(2);
  });
});

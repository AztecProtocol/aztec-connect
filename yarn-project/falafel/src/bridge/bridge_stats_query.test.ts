import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { BridgeConfig, BridgePublishQuery } from '@aztec/barretenberg/rollup_provider';
import { randomBytes } from 'crypto';
import { RollupDao, RollupProofDao } from '../entity/index.js';
import { RollupDb } from '../rollup_db/index.js';
import { TxFeeResolver } from '../tx_fee_resolver/index.js';
import { jest } from '@jest/globals';
import { BridgeStatsQueryHandler } from './bridge_stats_query.js';

jest.useFakeTimers({ doNotFake: ['performance'] });

type Mockify<T> = {
  [P in keyof T]: ReturnType<typeof jest.fn>;
};

const EMPTY_BUFFER = Buffer.alloc(32);

const buildRollupProofData = (rollupId: number, bridgeCallDatas: BridgeCallData[]) => {
  const proof = new RollupProofData(
    rollupId,
    1,
    0,
    EMPTY_BUFFER,
    randomBytes(32),
    EMPTY_BUFFER,
    randomBytes(32),
    EMPTY_BUFFER,
    randomBytes(32),
    EMPTY_BUFFER,
    randomBytes(32),
    bridgeCallDatas
      .map(x => x.toBuffer())
      .concat(
        Array.from({ length: RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - bridgeCallDatas.length }).map(
          () => EMPTY_BUFFER,
        ),
      ), // bridgeCallDatas
    Array.from({ length: RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK }).map(() => 0n), // defiDepositSums
    Array.from({ length: RollupProofData.NUMBER_OF_ASSETS }).map(() => 1 << 30), // assetIds value 1 << 30 is an invalid asset ID
    Array.from({ length: RollupProofData.NUMBER_OF_ASSETS }).map(() => 0n), // totalTxFees
    Array.from({ length: RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK }).map(() => EMPTY_BUFFER), // defiInteractionNotes
    EMPTY_BUFFER,
    EMPTY_BUFFER,
    1,
    [],
  );
  return proof;
};

const createDummyRollupDao = (rollupId: number, blockTime: Date | undefined, bridgeCallDatas: BridgeCallData[]) => {
  const rollupProof = buildRollupProofData(rollupId, bridgeCallDatas);
  const rollupDao = new RollupDao();
  rollupDao.rollupProof = new RollupProofDao({
    encodedProofData: rollupProof.encode(),
  });
  rollupDao.mined = blockTime;
  rollupDao.id = rollupId;
  return rollupDao;
};
const DEFAULT_BRIDGE_GAS_LIMIT = 1000000;
const DEFAULT_DEFI_BATCH_SIZE = 10;

const bridgeConfigs: BridgeConfig[] = [
  {
    bridgeAddressId: 1,
    numTxs: 5,
    gas: 1000000,
    permittedAssets: [0, 1],
  },

  {
    bridgeAddressId: 2,
    numTxs: 5,
    gas: 2000000,
    permittedAssets: [0, 1],
  },
];

const currentTime = new Date('2021-06-20T16:00:00+01:00');
const getCurrentTime = () => currentTime;

describe('bridge stats query', () => {
  let rollupDb: Mockify<RollupDb>;
  let txFeeResolver: Mockify<TxFeeResolver>;
  let dateNowSpy: any;

  const setupDateMock = () => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      return getCurrentTime().getTime();
    });
  };

  const restoreDateMock = () => {
    dateNowSpy.mockRestore();
  };

  beforeAll(() => {
    setupDateMock();
  });

  afterAll(() => {
    restoreDateMock();
  });

  beforeEach(() => {
    rollupDb = {
      getSettledRollups: jest.fn<any>().mockResolvedValue([]),
      getNextRollupId: jest.fn(),
      deleteUnsettledRollups: jest.fn(),
      deleteOrphanedRollupProofs: jest.fn(),
      deletePendingTxs: jest.fn(),
      getRollupProof: jest.fn<any>().mockResolvedValue(undefined),
      addRollup: jest.fn<any>(),
      getAssetMetrics: jest.fn().mockReturnValue(undefined),
      getBridgeMetricsForRollup: jest.fn(),
      getOurLastBridgeMetrics: jest.fn(),
      getRollup: jest.fn<any>(),
      getPendingTxs: jest.fn<any>(),
      getUnsettledTxCount: jest.fn<any>().mockResolvedValue(0),
      getPendingSecondClassTxCount: jest.fn<any>().mockResolvedValue(27),
      deleteTxsById: jest.fn(),
      getSettledRollupsAfterTime: jest.fn<any>(),
    } as Mockify<RollupDb>;

    txFeeResolver = {
      getSingleBridgeTxGas: jest.fn((bridgeCallData: bigint) => {
        const bridge = BridgeCallData.fromBigInt(bridgeCallData);
        const bridgeConfig = bridgeConfigs.find(b => b.bridgeAddressId === bridge.bridgeAddressId);
        const gas = bridgeConfig?.gas ?? DEFAULT_BRIDGE_GAS_LIMIT;
        const numTxs = bridgeConfig?.numTxs ?? DEFAULT_DEFI_BATCH_SIZE;
        return gas / numTxs;
      }),
      getFullBridgeGas: jest.fn((bridgeCallData: bigint) => {
        const bridge = BridgeCallData.fromBigInt(bridgeCallData);
        const bridgeConfig = bridgeConfigs.find(b => b.bridgeAddressId === bridge.bridgeAddressId);
        return bridgeConfig?.gas ?? DEFAULT_BRIDGE_GAS_LIMIT;
      }),
    } as Mockify<TxFeeResolver>;
  });

  it('correctly calculates bridge query results with differing bridge address id', async () => {
    const bcd1 = new BridgeCallData(1, 1, 2, undefined, undefined, 42n);
    const bcd2 = new BridgeCallData(2, 3, 6, undefined, undefined, 78n);
    const rollups = [
      createDummyRollupDao(0, new Date('2021-06-20T10:00:00+01:00'), [bcd1]),
      createDummyRollupDao(1, new Date('2021-06-20T11:00:00+01:00'), [bcd2]),
      createDummyRollupDao(2, new Date('2021-06-20T12:00:00+01:00'), [bcd2, bcd1]),
      createDummyRollupDao(3, new Date('2021-06-20T13:00:00+01:00'), [bcd2]),
      createDummyRollupDao(4, new Date('2021-06-20T14:00:00+01:00'), [bcd1, bcd2]),
      createDummyRollupDao(5, new Date('2021-06-20T15:00:00+01:00'), [bcd1]),
      createDummyRollupDao(6, new Date('2021-06-20T16:00:00+01:00'), [bcd2]),
    ];
    // the database will return all of the above blocks
    rollupDb.getSettledRollupsAfterTime.mockImplementation((time: Date) => {
      return rollups.filter(x => x.mined !== undefined && x.mined.getTime() >= time.getTime());
    });
    const bridgeQueryHandler = new BridgeStatsQueryHandler(rollupDb, txFeeResolver as any);

    // this query should find all bridge 2 call datas
    const result1 = await bridgeQueryHandler.processBridgeQuery({
      bridgeAddressId: 2,
    } as BridgePublishQuery);
    expect(result1.averageTimeout).toBe((5 * 60 * 60) / 4); // 4 interactions over 5 hours
    expect(result1.averageGasPerHour).toBe((bridgeConfigs[1].gas! * 4) / 5);

    // this query should find all bridge 1 call datas
    const result2 = await bridgeQueryHandler.processBridgeQuery({
      bridgeAddressId: 1,
    } as BridgePublishQuery);
    expect(result2.averageTimeout).toBe((5 * 60 * 60) / 3); // 3 interactions over 5 hours
    expect(result2.averageGasPerHour).toBe((bridgeConfigs[0].gas! * 3) / 5);
  });

  it('correctly calculates bridge query results with the same bridge address id', async () => {
    const bcd1 = new BridgeCallData(1, 1, 2, 7, 8, 42n);
    const bcd2 = new BridgeCallData(1, 3, 6, 9, 10, 78n);
    const rollups = [
      createDummyRollupDao(0, new Date('2021-06-20T10:00:00+01:00'), [bcd1]),
      createDummyRollupDao(1, new Date('2021-06-20T11:00:00+01:00'), [bcd2]),
      createDummyRollupDao(2, new Date('2021-06-20T12:00:00+01:00'), [bcd2, bcd1]),
      createDummyRollupDao(3, new Date('2021-06-20T13:00:00+01:00'), [bcd2]),
      createDummyRollupDao(4, new Date('2021-06-20T14:00:00+01:00'), [bcd1, bcd2]),
      createDummyRollupDao(5, new Date('2021-06-20T15:00:00+01:00'), [bcd1]),
      createDummyRollupDao(6, new Date('2021-06-20T16:00:00+01:00'), [bcd2]),
    ];
    // the database will return all of the above blocks
    rollupDb.getSettledRollupsAfterTime.mockImplementation((time: Date) => {
      return rollups.filter(x => x.mined !== undefined && x.mined.getTime() >= time.getTime());
    });
    const bridgeQueryHandler = new BridgeStatsQueryHandler(rollupDb, txFeeResolver as any);

    // test the following queries return the same stats
    const queries1 = [
      {
        bridgeAddressId: 1,
        inputAssetIdA: 1,
      },
      {
        bridgeAddressId: 1,
        inputAssetIdB: 7,
      },
      {
        bridgeAddressId: 1,
        outputAssetIdA: 2,
      },
      {
        bridgeAddressId: 1,
        outputAssetIdB: 8,
      },
      {
        bridgeAddressId: 1,
        auxData: 42n,
      },
    ];
    for (const query of queries1) {
      // each query should find all bcd1 interactions
      const result = await bridgeQueryHandler.processBridgeQuery(query as BridgePublishQuery);
      expect(result.averageTimeout).toBe((5 * 60 * 60) / 3); // 3 interactions over 5 hours
      expect(result.averageGasPerHour).toBe((bridgeConfigs[0].gas! * 3) / 5);
    }

    // these queries whould return the same stats
    const queries2 = [
      {
        bridgeAddressId: 1,
        inputAssetIdA: 3,
      },
      {
        bridgeAddressId: 1,
        inputAssetIdB: 9,
      },
      {
        bridgeAddressId: 1,
        outputAssetIdA: 6,
      },
      {
        bridgeAddressId: 1,
        outputAssetIdB: 10,
      },
      {
        bridgeAddressId: 1,
        auxData: 78n,
      },
    ];

    for (const query of queries2) {
      // each query should find all bcd2 interactions
      const result = await bridgeQueryHandler.processBridgeQuery(query as BridgePublishQuery);
      expect(result.averageTimeout).toBe((5 * 60 * 60) / 4); // 4 interactions over 5 hours
      expect(result.averageGasPerHour).toBe((bridgeConfigs[0].gas! * 4) / 5);
    }
  });

  it('correctly filters out interactions where a single value is different', async () => {
    const bcd1 = new BridgeCallData(1, 1, 2, 7, 8, 42n);
    const bcd2 = new BridgeCallData(1, 3, 6, 9, 10, 78n);
    const rollups = [
      createDummyRollupDao(0, new Date('2021-06-20T10:00:00+01:00'), [bcd1]),
      createDummyRollupDao(1, new Date('2021-06-20T11:00:00+01:00'), [bcd2]),
      createDummyRollupDao(2, new Date('2021-06-20T12:00:00+01:00'), [bcd2, bcd1]),
      createDummyRollupDao(3, new Date('2021-06-20T13:00:00+01:00'), [bcd2]),
      createDummyRollupDao(4, new Date('2021-06-20T14:00:00+01:00'), [bcd1, bcd2]),
      createDummyRollupDao(5, new Date('2021-06-20T15:00:00+01:00'), [bcd1]),
      createDummyRollupDao(6, new Date('2021-06-20T16:00:00+01:00'), [bcd2]),
    ];
    // the database will return all of the above blocks
    rollupDb.getSettledRollupsAfterTime.mockImplementation((time: Date) => {
      return rollups.filter(x => x.mined !== undefined && x.mined.getTime() >= time.getTime());
    });
    const bridgeQueryHandler = new BridgeStatsQueryHandler(rollupDb, txFeeResolver as any);

    // the following queries should return nothing
    const queries1 = [
      {
        bridgeAddressId: 1,
        inputAssetIdA: 2,
      },
      {
        bridgeAddressId: 1,
        inputAssetIdB: 8,
      },
      {
        bridgeAddressId: 1,
        outputAssetIdA: 1,
      },
      {
        bridgeAddressId: 1,
        outputAssetIdB: 7,
      },
      {
        bridgeAddressId: 1,
        auxData: 43n,
      },
    ];
    for (const query of queries1) {
      const result = await bridgeQueryHandler.processBridgeQuery(query as BridgePublishQuery);
      expect(result.averageTimeout).toBe(0);
      expect(result.averageGasPerHour).toBe(0);
    }
  });

  it('correctly averages over all interactions with the same query parameters', async () => {
    const bcd1 = new BridgeCallData(1, 1, 2, undefined, undefined, 42n);
    const bcd2 = new BridgeCallData(1, 1, 6, undefined, undefined, 78n);
    const rollups = [
      createDummyRollupDao(0, new Date('2021-06-20T10:00:00+01:00'), [bcd1]),
      createDummyRollupDao(1, new Date('2021-06-20T11:00:00+01:00'), [bcd2]),
      createDummyRollupDao(2, new Date('2021-06-20T12:00:00+01:00'), [bcd2, bcd1]),
      createDummyRollupDao(3, new Date('2021-06-20T13:00:00+01:00'), [bcd2]),
      createDummyRollupDao(4, new Date('2021-06-20T14:00:00+01:00'), [bcd1, bcd2]),
      createDummyRollupDao(5, new Date('2021-06-20T15:00:00+01:00'), [bcd1]),
      createDummyRollupDao(6, new Date('2021-06-20T16:00:00+01:00'), [bcd2]),
    ];
    // the database will return all of the above blocks
    rollupDb.getSettledRollupsAfterTime.mockImplementation((time: Date) => {
      return rollups.filter(x => x.mined !== undefined && x.mined.getTime() >= time.getTime());
    });
    const bridgeQueryHandler = new BridgeStatsQueryHandler(rollupDb, txFeeResolver as any);

    const query = {
      bridgeAddressId: 1,
      inputAssetIdA: 1,
    };
    // this query should return all interactions
    const result = await bridgeQueryHandler.processBridgeQuery(query as BridgePublishQuery);
    expect(result.averageTimeout).toBe((6 * 60 * 60) / 8); // 8 interactions over 6 hours
    expect(result.averageGasPerHour).toBe((bridgeConfigs[0].gas! * 8) / 6); // 5 bcd2 interactions and 3 bcd1 interactions over 6 hours
  });

  it('correctly handles concurrent queries', async () => {
    const bcd1 = new BridgeCallData(1, 1, 2, undefined, undefined, 42n);
    const bcd2 = new BridgeCallData(1, 1, 6, undefined, undefined, 78n);
    const rollups = [
      createDummyRollupDao(0, new Date('2021-06-20T10:00:00+01:00'), [bcd1]),
      createDummyRollupDao(1, new Date('2021-06-20T11:00:00+01:00'), [bcd2]),
      createDummyRollupDao(2, new Date('2021-06-20T12:00:00+01:00'), [bcd2, bcd1]),
      createDummyRollupDao(3, new Date('2021-06-20T13:00:00+01:00'), [bcd2]),
      createDummyRollupDao(4, new Date('2021-06-20T14:00:00+01:00'), [bcd1, bcd2]),
      createDummyRollupDao(5, new Date('2021-06-20T15:00:00+01:00'), [bcd1]),
      createDummyRollupDao(6, new Date('2021-06-20T16:00:00+01:00'), [bcd2]),
    ];
    // the db will return the rollups
    rollupDb.getSettledRollupsAfterTime.mockImplementation((time: Date) => {
      return rollups.filter(x => x.mined !== undefined && x.mined.getTime() >= time.getTime());
    });
    const bridgeQueryHandler = new BridgeStatsQueryHandler(rollupDb, txFeeResolver as any);

    const queryOperation = async () => {
      const query = {
        bridgeAddressId: 1,
        inputAssetIdA: 1,
      };
      // this query should return all interactions
      return await bridgeQueryHandler.processBridgeQuery(query as BridgePublishQuery);
    };
    const promises = new Array(1000).fill(0).map(queryOperation);
    const results = await Promise.all(promises);
    for (const result of results) {
      expect(result.averageTimeout).toBe((6 * 60 * 60) / 8); // 8 interactions over 6 hours
      expect(result.averageGasPerHour).toBe((bridgeConfigs[0].gas! * 8) / 6); // 5 bcd2 interactions and 3 bcd1 interactions over 6 hours
    }
  });

  it('does not unnecessarily query the database', async () => {
    const bcd1 = new BridgeCallData(1, 1, 2, 7, 8, 42n);
    const bcd2 = new BridgeCallData(1, 3, 6, 9, 10, 78n);
    const rollups = [
      createDummyRollupDao(0, new Date('2021-06-20T10:00:00+01:00'), [bcd1]),
      createDummyRollupDao(1, new Date('2021-06-20T11:00:00+01:00'), [bcd2]),
      createDummyRollupDao(2, new Date('2021-06-20T12:00:00+01:00'), [bcd2, bcd1]),
      createDummyRollupDao(3, new Date('2021-06-20T13:00:00+01:00'), [bcd2]),
      createDummyRollupDao(4, new Date('2021-06-20T14:00:00+01:00'), [bcd1, bcd2]),
      createDummyRollupDao(5, new Date('2021-06-20T15:00:00+01:00'), [bcd1]),
      createDummyRollupDao(6, new Date('2021-06-20T16:00:00+01:00'), [bcd2]),
    ];
    rollupDb.getSettledRollupsAfterTime.mockImplementation((time: Date) => {
      return rollups.filter(x => x.mined !== undefined && x.mined.getTime() >= time.getTime());
    });
    const bridgeQueryHandler = new BridgeStatsQueryHandler(rollupDb, txFeeResolver as any);

    // run the same query multiple times and see that we only query the db once
    const query = {
      bridgeAddressId: 1,
      inputAssetIdA: 1,
    };
    for (let i = 0; i < 5; i++) {
      // each query should find all bcd1 interactions
      await bridgeQueryHandler.processBridgeQuery(query as BridgePublishQuery);
    }
    expect(rollupDb.getSettledRollupsAfterTime).toBeCalledTimes(1);
  });
});

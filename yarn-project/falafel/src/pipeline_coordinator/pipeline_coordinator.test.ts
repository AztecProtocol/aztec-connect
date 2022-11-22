import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { randomBytes } from 'crypto';
import moment from 'moment';
import { PipelineCoordinator } from './index.js';
import { ClaimProofCreator } from '../claim_proof_creator.js';
import { TxDao } from '../entity/tx.js';
import { RollupAggregator } from '../rollup_aggregator.js';
import { RollupCreator } from '../rollup_creator.js';
import { RollupDb } from '../rollup_db/index.js';
import { RollupPublisher } from '../rollup_publisher.js';
import { TxFeeResolver } from '../tx_fee_resolver/index.js';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeResolver } from '../bridge/index.js';
import { Metrics } from '../metrics/index.js';
import { jest } from '@jest/globals';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('pipeline_coordinator', () => {
  const numInnerRollupTxs = 2;
  const numOuterRollupProofs = 4;
  const publishInterval = 10;
  let rollupCreator: Mockify<RollupCreator>;
  let rollupAggregator: Mockify<RollupAggregator>;
  let rollupPublisher: Mockify<RollupPublisher>;
  let claimProofCreator: Mockify<ClaimProofCreator>;
  let rollupDb: Mockify<RollupDb>;
  let worldStateDb: Mockify<WorldStateDb>;
  let noteAlgo: Mockify<NoteAlgorithms>;
  let feeResolver: Mockify<TxFeeResolver>;
  let bridgeResolver: Mockify<BridgeResolver>;
  let metrics: Mockify<Metrics>;
  let coordinator: PipelineCoordinator;

  const mockRollup = () => ({ id: 0, interactionResult: Buffer.alloc(0), mined: moment() });

  const mockTx = (created = moment()) =>
    ({
      id: randomBytes(32),
      proofData: Buffer.concat([
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        Buffer.alloc(32),
        randomBytes(64),
        randomBytes(64),
        randomBytes(32),
        toBufferBE(100000n, 32),
        Buffer.alloc(32),
        randomBytes(32),
        randomBytes(32),
      ]),
      created: created.toDate(),
      txType: TxType.TRANSFER,
      excessGas: 100000,
    } as TxDao);

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1618226000000);

    jest.spyOn(console, 'log').mockImplementation(() => {});

    rollupCreator = {
      create: jest.fn<any>().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
      createRollup: jest.fn(),
    } as Mockify<RollupCreator>;

    rollupAggregator = {
      aggregateRollupProofs: jest.fn<any>().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    } as Mockify<RollupAggregator>;

    rollupPublisher = {
      publishRollup: jest.fn<any>().mockResolvedValue(true),
      interrupt: jest.fn(),
    } as Mockify<RollupPublisher>;

    claimProofCreator = {
      create: jest.fn<any>().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    } as Mockify<ClaimProofCreator>;

    worldStateDb = {
      getRoot: jest.fn().mockReturnValue(Buffer.alloc(32)),
      getHashPath: jest.fn(),
    } as any;

    rollupDb = {
      getPendingSecondClassTxCount: jest.fn<any>().mockResolvedValue(0),
      getPendingTxCount: jest.fn<any>().mockResolvedValue(0),
      deleteUnsettledRollups: jest.fn(),
      deleteOrphanedRollupProofs: jest.fn(),
      deleteUnsettledClaimTxs: jest.fn(),
      getLastSettledRollup: jest.fn<any>().mockResolvedValue(undefined),
      getPendingTxs: jest.fn<any>().mockResolvedValue([]),
      getPendingSecondClassTxs: jest.fn<any>().mockResolvedValue([]),
    } as any;

    feeResolver = {
      getAdjustedBaseVerificationGas: jest.fn().mockReturnValue(1),
      getUnadjustedBaseVerificationGas: jest.fn().mockReturnValue(1),
      getGasPaidForByFee: jest.fn((assetId: number, fee: bigint) => fee),
      getTxFeeFromGas: jest.fn((assetId: number, gas: bigint) => gas),
      start: jest.fn(),
      stop: jest.fn(),
      getAdjustedTxGas: jest.fn().mockReturnValue(1000),
      getUnadjustedTxGas: jest.fn().mockReturnValue(1000),
      getAdjustedBridgeTxGas: jest.fn(),
      getUnadjustedBridgeTxGas: jest.fn(),
      getFullBridgeGas: jest.fn().mockReturnValue(100000n),
      getFullBridgeGasFromContract: jest.fn().mockReturnValue(100000n),
      getSingleBridgeTxGas: jest.fn().mockReturnValue(10000n),
      getTxFees: jest.fn(),
      getDefiFees: jest.fn(),
      isFeePayingAsset: jest.fn((assetId: number) => assetId < 3),
      getTxCallData: jest.fn().mockReturnValue(100),
      getMaxTxCallData: jest.fn().mockReturnValue(100),
      getMaxUnadjustedGas: jest.fn().mockReturnValue(1000),
    } as Mockify<TxFeeResolver>;

    bridgeResolver = {
      getBridgeConfigs: jest.fn().mockReturnValue([]),
    } as any;

    noteAlgo = {
      commitDefiInteractionNote: jest.fn(),
    } as any;

    metrics = {
      recordRollupMetrics: jest.fn(),
      rollupPublished: jest.fn<any>().mockResolvedValue(true),
    } as any;

    coordinator = new PipelineCoordinator(
      rollupCreator as any,
      rollupAggregator as any,
      rollupPublisher as any,
      claimProofCreator as any,
      feeResolver as any,
      worldStateDb as any,
      rollupDb as any,
      noteAlgo as any,
      numInnerRollupTxs,
      numOuterRollupProofs,
      publishInterval,
      0,
      bridgeResolver as any,
      128 * 1024,
      12000000,
      metrics as any,
    );
  });

  it('should publish a rollup', async () => {
    rollupDb.getPendingTxs.mockImplementation(() => [mockTx(moment().subtract(publishInterval))]);
    await coordinator.start();
    expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
  });

  it('should continue to process pending txs until publish', async () => {
    rollupDb.getLastSettledRollup.mockImplementation(() => mockRollup());
    rollupDb.getPendingTxs.mockImplementation(() => [mockTx(), mockTx()]);
    await coordinator.start();
    expect(rollupPublisher.publishRollup).toHaveBeenCalledTimes(1);
  });

  it('should return publishInterval seconds from now if not running', async () => {
    expect(coordinator.getNextPublishTime().baseTimeout?.timeout).toEqual(moment().add(10, 's').toDate());
    coordinator.start().catch(console.log);
    await new Promise(resolve => setTimeout(resolve, 100));
    await coordinator.stop(false);
    expect(coordinator.getNextPublishTime().baseTimeout?.timeout).toEqual(moment().add(10, 's').toDate());
  });

  it('cannot start when it has already started', async () => {
    coordinator.start().catch(console.log);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expect(async () => await coordinator.start()).rejects.toEqual(
      new Error('Pipeline coordinator is already running.'),
    );
    await coordinator.stop(false);
  });

  it('should interrupt all helpers when it is stopped with throw flag not set', async () => {
    coordinator.start().catch(console.log);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expect(coordinator.stop(false)).resolves.not.toThrow();
    expect(rollupCreator.interrupt).toHaveBeenCalledTimes(1);
    expect(rollupAggregator.interrupt).toHaveBeenCalledTimes(1);
  });

  it('should interrupt all helpers when it is stopped with throw flag set and has not published', async () => {
    coordinator.start().catch(console.log);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expect(coordinator.stop(true)).resolves.not.toThrow();
    expect(rollupCreator.interrupt).toHaveBeenCalledTimes(1);
    expect(rollupAggregator.interrupt).toHaveBeenCalledTimes(1);
  });
});

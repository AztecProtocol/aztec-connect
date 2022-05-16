import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { randomBytes } from 'crypto';
import moment from 'moment';
import { PipelineCoordinator } from '.';
import { ClaimProofCreator } from '../claim_proof_creator';
import { TxDao } from '../entity/tx';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupDb } from '../rollup_db';
import { RollupPublisher } from '../rollup_publisher';
import { TxFeeResolver } from '../tx_fee_resolver';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeResolver } from '../bridge';

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
      create: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
      createRollup: jest.fn(),
      addRollupProofs: jest.fn(),
    };

    rollupAggregator = {
      aggregateRollupProofs: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    };

    rollupPublisher = {
      publishRollup: jest.fn().mockResolvedValue(true),
      interrupt: jest.fn(),
    };

    claimProofCreator = {
      create: jest.fn().mockResolvedValue(Buffer.alloc(0)),
      interrupt: jest.fn(),
    };

    worldStateDb = {
      getRoot: jest.fn().mockResolvedValue(Buffer.alloc(32)),
      getHashPath: jest.fn(),
    } as any;

    rollupDb = {
      deleteUnsettledRollups: jest.fn(),
      deleteOrphanedRollupProofs: jest.fn(),
      deleteUnsettledClaimTxs: jest.fn(),
      getLastSettledRollup: jest.fn().mockResolvedValue(undefined),
      getPendingTxs: jest.fn().mockResolvedValue([]),
    } as any;

    feeResolver = {
      getBaseTxGas: jest.fn().mockReturnValue(1),
      getGasPaidForByFee: jest.fn().mockImplementation((assetId: number, fee: bigint) => fee),
      getMinTxFee: jest.fn().mockImplementation(() => {
        throw new Error('This should not be called');
      }),
      start: jest.fn(),
      stop: jest.fn(),
      getTxGas: jest.fn().mockImplementation(() => {
        throw new Error('This should not be called');
      }),
      getBridgeTxGas: jest.fn(),
      getFullBridgeGas: jest.fn().mockReturnValue(100000n),
      getSingleBridgeTxGas: jest.fn().mockReturnValue(10000n),
      getTxFees: jest.fn(),
      getDefiFees: jest.fn(),
      isFeePayingAsset: jest.fn().mockImplementation((assetId: number) => assetId < 3),
    };

    bridgeResolver = {
      getBridgeConfigs: jest.fn().mockReturnValue([]),
    } as any;

    noteAlgo = {
      commitDefiInteractionNote: jest.fn(),
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
    coordinator.start();
    await new Promise(resolve => setTimeout(resolve, 100));
    coordinator.stop();
    expect(coordinator.getNextPublishTime().baseTimeout?.timeout).toEqual(moment().add(10, 's').toDate());
  });

  it('cannot start when it has already started', async () => {
    const p = coordinator.start();
    await expect(async () => coordinator.start()).rejects.toThrow();
    coordinator.stop();
    await p;
  });

  it('should interrupt all helpers when it is stop', async () => {
    coordinator.start();
    await new Promise(resolve => setTimeout(resolve, 100));
    coordinator.stop();
    expect(rollupCreator.interrupt).toHaveBeenCalledTimes(1);
    expect(rollupAggregator.interrupt).toHaveBeenCalledTimes(1);
    expect(rollupPublisher.interrupt).toHaveBeenCalledTimes(1);
  });
});

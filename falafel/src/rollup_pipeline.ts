import { Blockchain } from 'barretenberg/blockchain';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumProvider } from 'blockchain';
import { ProofGenerator } from 'halloumi/proof_generator';
import { Duration } from 'moment';
import { Metrics } from './metrics';
import { RollupAggregator } from './rollup_aggregator';
import { RollupCreator } from './rollup_creator';
import { RollupDb } from './rollup_db';
import { RollupPublisher } from './rollup_publisher';
import { TxAggregator } from './tx_aggregator';

export class RollupPipeline {
  private txAggregator: TxAggregator;
  private rollupPublisher: RollupPublisher;

  constructor(
    proofGenerator: ProofGenerator,
    blockchain: Blockchain,
    rollupDb: RollupDb,
    worldStateDb: WorldStateDb,
    metrics: Metrics,
    provider: EthereumProvider,
    publishInterval: Duration,
    feeLimit: bigint,
    numInnerRollupTxs: number,
    numOuterRollupProofs: number,
  ) {
    const innerRollupSize = 1 << Math.ceil(Math.log2(numInnerRollupTxs));
    const outerRollupSize = 1 << Math.ceil(Math.log2(innerRollupSize * numOuterRollupProofs));

    console.log(
      `Pipeline inner_txs/outer_txs/rollup_size: ${numInnerRollupTxs}/${numOuterRollupProofs}/${outerRollupSize}`,
    );

    this.rollupPublisher = new RollupPublisher(rollupDb, blockchain, publishInterval, feeLimit, provider, metrics);
    const rollupAggregator = new RollupAggregator(
      proofGenerator,
      this.rollupPublisher,
      rollupDb,
      worldStateDb,
      innerRollupSize,
      outerRollupSize,
      numInnerRollupTxs,
      numOuterRollupProofs,
      metrics,
    );

    const rollupCreator = new RollupCreator(
      rollupDb,
      worldStateDb,
      proofGenerator,
      rollupAggregator,
      numInnerRollupTxs,
      innerRollupSize,
      outerRollupSize,
      metrics,
    );
    this.txAggregator = new TxAggregator(rollupCreator, rollupDb, numInnerRollupTxs, publishInterval);
  }

  public getPendingTxCount() {
    return this.txAggregator.getPendingTxCount();
  }

  public async getLastPublishedTime() {
    return this.rollupPublisher.getLastPublishedTime();
  }

  start() {
    return this.txAggregator.start();
  }

  async stop() {
    await this.txAggregator.stop();
  }

  flushTxs() {
    return this.txAggregator.flushTxs();
  }
}

export class RollupPipelineFactory {
  constructor(
    private proofGenerator: ProofGenerator,
    private blockchain: Blockchain,
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
    private metrics: Metrics,
    private provider: EthereumProvider,
    private publishInterval: Duration,
    private feeLimit: bigint,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
  ) {}

  public setTopology(numInnerRollupTxs: number, numOuterRollupProofs: number) {
    this.numInnerRollupTxs = numInnerRollupTxs;
    this.numOuterRollupProofs = numOuterRollupProofs;
  }

  public async create() {
    return new RollupPipeline(
      this.proofGenerator,
      this.blockchain,
      this.rollupDb,
      this.worldStateDb,
      this.metrics,
      this.provider,
      this.publishInterval,
      this.feeLimit,
      this.numInnerRollupTxs,
      this.numOuterRollupProofs,
    );
  }
}

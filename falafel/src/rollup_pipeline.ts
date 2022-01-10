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
import { PipelineCoordinator } from './pipeline_coordinator';
import { TxFeeResolver } from './tx_fee_resolver';

export class RollupPipeline {
  private pipelineCoordinator: PipelineCoordinator;

  constructor(
    proofGenerator: ProofGenerator,
    blockchain: Blockchain,
    rollupDb: RollupDb,
    worldStateDb: WorldStateDb,
    metrics: Metrics,
    provider: EthereumProvider,
    publishInterval: Duration,
    feeLimit: bigint,
    maxProviderGasPrice: bigint,
    providerGasPriceMultiplier: number,
    numInnerRollupTxs: number,
    numOuterRollupProofs: number,
    feeResolver: TxFeeResolver,
    gasLimit?: number,
  ) {
    const innerRollupSize = 1 << Math.ceil(Math.log2(numInnerRollupTxs));
    const outerRollupSize = 1 << Math.ceil(Math.log2(innerRollupSize * numOuterRollupProofs));

    console.log(
      `Pipeline inner_txs/outer_txs/rollup_size: ${numInnerRollupTxs}/${numOuterRollupProofs}/${outerRollupSize}`,
    );

    const rollupPublisher = new RollupPublisher(
      rollupDb,
      blockchain,
      feeLimit,
      maxProviderGasPrice,
      providerGasPriceMultiplier,
      gasLimit,
      provider,
      metrics,
    );
    const rollupAggregator = new RollupAggregator(
      proofGenerator,
      rollupDb,
      worldStateDb,
      outerRollupSize,
      numInnerRollupTxs,
      numOuterRollupProofs,
      metrics,
    );
    const rollupCreator = new RollupCreator(
      rollupDb,
      worldStateDb,
      proofGenerator,
      numInnerRollupTxs,
      innerRollupSize,
      outerRollupSize,
      metrics,
    );
    this.pipelineCoordinator = new PipelineCoordinator(
      rollupCreator,
      rollupAggregator,
      rollupPublisher,
      rollupDb,
      numInnerRollupTxs,
      numOuterRollupProofs,
      publishInterval,
      feeResolver,
    );
  }

  public getNextPublishTime() {
    return this.pipelineCoordinator.getNextPublishTime();
  }

  public async start() {
    return this.pipelineCoordinator.start();
  }

  public async stop() {
    await this.pipelineCoordinator.stop();
  }

  public flushTxs() {
    this.pipelineCoordinator.flushTxs();
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
    private maxProviderGasPrice: bigint,
    private providerGasPriceMultiplier: number,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private txFeeResolver: TxFeeResolver,
    private gasLimit?: number,
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
      this.maxProviderGasPrice,
      this.providerGasPriceMultiplier,
      this.numInnerRollupTxs,
      this.numOuterRollupProofs,
      this.txFeeResolver,
      this.gasLimit,
    );
  }
}

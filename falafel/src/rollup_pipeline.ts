import { Blockchain } from '@aztec/barretenberg/blockchain';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { EthereumProvider } from '@aztec/blockchain';
import { ProofGenerator } from 'halloumi/proof_generator';
import { Duration } from 'moment';
import { ClaimProofCreator } from './claim_proof_creator';
import { Metrics } from './metrics';
import { PipelineCoordinator } from './pipeline_coordinator';
import { RollupAggregator } from './rollup_aggregator';
import { RollupCreator } from './rollup_creator';
import { RollupDb } from './rollup_db';
import { RollupPublisher } from './rollup_publisher';
import { TxFeeResolver } from './tx_fee_resolver';

export class RollupPipeline {
  private pipelineCoordinator: PipelineCoordinator;

  constructor(
    proofGenerator: ProofGenerator,
    blockchain: Blockchain,
    rollupDb: RollupDb,
    worldStateDb: WorldStateDb,
    feeResolver: TxFeeResolver,
    noteAlgo: NoteAlgorithms,
    metrics: Metrics,
    provider: EthereumProvider,
    publishInterval: Duration,
    feeLimit: bigint,
    maxFeeGasPrice: bigint,
    providerGasPriceMultiplier: number,
    numInnerRollupTxs: number,
    numOuterRollupProofs: number,
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
      maxFeeGasPrice,
      providerGasPriceMultiplier,
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
      noteAlgo,
      numInnerRollupTxs,
      innerRollupSize,
      outerRollupSize,
      metrics,
    );
    const claimProofCreator = new ClaimProofCreator(rollupDb, worldStateDb, proofGenerator);
    this.pipelineCoordinator = new PipelineCoordinator(
      rollupCreator,
      rollupAggregator,
      rollupPublisher,
      claimProofCreator,
      feeResolver,
      worldStateDb,
      rollupDb,
      noteAlgo,
      numInnerRollupTxs,
      numOuterRollupProofs,
      publishInterval,
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
    private txFeeResolver: TxFeeResolver,
    private noteAlgo: NoteAlgorithms,
    private metrics: Metrics,
    private provider: EthereumProvider,
    private publishInterval: Duration,
    private feeLimit: bigint,
    private maxFeeGasPrice: bigint,
    private providerGasPriceMultiplier: number,
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
      this.txFeeResolver,
      this.noteAlgo,
      this.metrics,
      this.provider,
      this.publishInterval,
      this.feeLimit,
      this.maxFeeGasPrice,
      this.providerGasPriceMultiplier,
      this.numInnerRollupTxs,
      this.numOuterRollupProofs,
    );
  }
}

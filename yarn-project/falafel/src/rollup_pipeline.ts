import { EthAddress } from '@aztec/barretenberg/address';
import { Blockchain } from '@aztec/barretenberg/blockchain';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { BridgeResolver } from './bridge/index.js';
import { ProofGenerator } from '@aztec/halloumi/proof_generator';
import { ClaimProofCreator } from './claim_proof_creator.js';
import { Metrics } from './metrics/index.js';
import { PipelineCoordinator } from './pipeline_coordinator/index.js';
import { RollupAggregator } from './rollup_aggregator.js';
import { RollupCreator } from './rollup_creator.js';
import { RollupDb } from './rollup_db/index.js';
import { RollupPublisher } from './rollup_publisher.js';
import { TxFeeResolver } from './tx_fee_resolver/index.js';
import { fromBaseUnits } from '@aztec/blockchain';
import { createLogger } from '@aztec/barretenberg/log';

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
    rollupBeneficiary: EthAddress,
    publishInterval: number,
    flushAfterIdle: number,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint,
    gasLimit: number,
    numInnerRollupTxs: number,
    numOuterRollupProofs: number,
    bridgeResolver: BridgeResolver,
    maxCallDataPerRollup: number,
    private log = createLogger('RollupPipeline'),
  ) {
    const innerRollupSize = 1 << Math.ceil(Math.log2(numInnerRollupTxs));
    const outerRollupSize = 1 << Math.ceil(Math.log2(innerRollupSize * numOuterRollupProofs));

    this.log('New pipeline...');
    this.log(`  numInnerRollupTxs: ${numInnerRollupTxs}`);
    this.log(`  numOuterRollupProofs: ${numOuterRollupProofs}`);
    this.log(`  rollupSize: ${outerRollupSize}`);
    this.log(`  publishInterval: ${publishInterval}s`);
    this.log(`  flushAfterIdle: ${flushAfterIdle}s`);
    this.log(`  gasLimit: ${gasLimit}`);
    this.log(`  maxCallDataPerRollup: ${maxCallDataPerRollup}`);
    this.log(`  maxFeePerGas: ${fromBaseUnits(maxFeePerGas, 9, 2)} gwei`);
    this.log(`  maxPriorityFeePerGas: ${fromBaseUnits(maxPriorityFeePerGas, 9, 2)} gwei`);

    const rollupPublisher = new RollupPublisher(
      rollupDb,
      blockchain,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit,
      maxCallDataPerRollup,
      metrics,
    );
    const rollupAggregator = new RollupAggregator(
      proofGenerator,
      rollupDb,
      worldStateDb,
      outerRollupSize,
      numOuterRollupProofs,
      rollupBeneficiary,
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
      feeResolver,
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
      flushAfterIdle,
      bridgeResolver,
      maxCallDataPerRollup,
      gasLimit,
      metrics,
    );
  }

  public getNextPublishTime() {
    return this.pipelineCoordinator.getNextPublishTime();
  }

  public getProcessedTxs() {
    return this.pipelineCoordinator.getProcessedTxs();
  }

  public start() {
    return this.pipelineCoordinator.start();
  }

  public async stop(shouldThrowIfFailToStop: boolean) {
    await this.pipelineCoordinator.stop(shouldThrowIfFailToStop);
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
    private rollupBeneficiary: EthAddress,
    private publishInterval: number,
    private flushAfterIdle: number,
    private maxFeePerGas: bigint,
    private maxPriorityFeePerGas: bigint,
    private gasLimit: number,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
    private bridgeResolver: BridgeResolver,
    private maxCallDataPerRollup: number,
  ) {}

  public setConf(
    txFeeResolver: TxFeeResolver,
    publishInterval: number,
    flushAfterIdle: number,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint,
    gasLimit: number,
    rollupBeneficiary: EthAddress,
  ) {
    this.txFeeResolver = txFeeResolver;
    this.publishInterval = publishInterval;
    this.flushAfterIdle = flushAfterIdle;
    this.maxFeePerGas = maxFeePerGas;
    this.maxPriorityFeePerGas = maxPriorityFeePerGas;
    this.gasLimit = gasLimit;
    this.rollupBeneficiary = rollupBeneficiary;
  }

  public getRollupSize() {
    const innerRollupSize = 1 << Math.ceil(Math.log2(this.numInnerRollupTxs));
    const outerRollupSize = 1 << Math.ceil(Math.log2(innerRollupSize * this.numOuterRollupProofs));
    return outerRollupSize;
  }

  public async create() {
    await this.proofGenerator.stop();
    await this.proofGenerator.start();
    return new RollupPipeline(
      this.proofGenerator,
      this.blockchain,
      this.rollupDb,
      this.worldStateDb,
      this.txFeeResolver,
      this.noteAlgo,
      this.metrics,
      this.rollupBeneficiary,
      this.publishInterval,
      this.flushAfterIdle,
      this.maxFeePerGas,
      this.maxPriorityFeePerGas,
      this.gasLimit,
      this.numInnerRollupTxs,
      this.numOuterRollupProofs,
      this.bridgeResolver,
      this.maxCallDataPerRollup,
    );
  }
}

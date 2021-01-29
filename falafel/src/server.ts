import { emptyDir } from 'fs-extra';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { RollupProviderStatus, TxHash } from 'barretenberg/rollup_provider';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumProvider } from 'blockchain';
import { Duration } from 'moment';
import { ProofGenerator } from './proof_generator';
import { RollupDb } from './rollup_db';
import { Tx, TxReceiver } from './tx_receiver';
import { RollupCreator } from './rollup_creator';
import { TxAggregator } from './tx_aggregator';
import { WorldState } from './world_state';
import { RollupPublisher } from './rollup_publisher';
import { RollupAggregator } from './rollup_aggregator';
import moment from 'moment';
import { Metrics } from './metrics';
import { Blockchain } from 'barretenberg/blockchain';
import { Block } from 'barretenberg/block_source';
import { toBigIntBE } from 'bigint-buffer';

export interface ServerConfig {
  readonly numInnerRollupTxs: number;
  readonly numOuterRollupProofs: number;
  readonly publishInterval: Duration;
  readonly feeLimit: bigint;
  readonly minFees: bigint[];
}

export class Server {
  private worldState: WorldState;
  private txReceiver: TxReceiver;
  private proofGenerator: ProofGenerator;

  constructor(
    private config: ServerConfig,
    private blockchain: Blockchain,
    private rollupDb: RollupDb,
    worldStateDb: WorldStateDb,
    private metrics: Metrics,
    provider: EthereumProvider,
  ) {
    const { numInnerRollupTxs, numOuterRollupProofs, publishInterval, feeLimit } = config;
    const innerRollupSize = 1 << Math.ceil(Math.log2(numInnerRollupTxs));
    const outerRollupSize = 1 << Math.ceil(Math.log2(innerRollupSize * numOuterRollupProofs));

    console.log(`Num inner rollup txs: ${numInnerRollupTxs}`);
    console.log(`Num outer rollup proofs: ${numOuterRollupProofs}`);
    console.log(`Inner rollup size: ${innerRollupSize}`);
    console.log(`Outer rollup size: ${outerRollupSize}`);

    this.proofGenerator = new ProofGenerator(numInnerRollupTxs, numOuterRollupProofs);
    const rollupPublisher = new RollupPublisher(rollupDb, blockchain, publishInterval, feeLimit, provider, metrics);
    const rollupAggregator = new RollupAggregator(
      this.proofGenerator,
      rollupPublisher,
      rollupDb,
      worldStateDb,
      innerRollupSize,
      outerRollupSize,
      numOuterRollupProofs,
      metrics,
    );
    const rollupCreator = new RollupCreator(
      rollupDb,
      worldStateDb,
      this.proofGenerator,
      rollupAggregator,
      numInnerRollupTxs,
      innerRollupSize,
      metrics,
    );
    const txAggregator = new TxAggregator(rollupCreator, rollupDb, numInnerRollupTxs, publishInterval);
    this.worldState = new WorldState(rollupDb, worldStateDb, blockchain, txAggregator, outerRollupSize, metrics);
    this.txReceiver = new TxReceiver(rollupDb, blockchain, config.minFees);
  }

  public async start() {
    console.log('Server start...');
    await this.proofGenerator.start();
    await this.worldState.start();
    // The tx receiver depends on the proof generator to have been initialized to gain access to vks.
    await this.txReceiver.init();
  }

  public async stop() {
    console.log('Server stop...');
    await this.txReceiver.destroy();
    await this.worldState.stop();
    this.proofGenerator.stop();
  }

  public async removeData() {
    console.log('Removing data dir and signal to shutdown...');
    await emptyDir('./data');
    process.kill(process.pid, 'SIGINT');
  }

  public async getStatus(): Promise<RollupProviderStatus> {
    const status = await this.blockchain.getBlockchainStatus();

    return {
      blockchainStatus: status,
      minFees: this.config.minFees,
    };
  }

  public async getNextPublishTime() {
    const pendingTxs = await this.rollupDb.getPendingTxCount();
    if (!pendingTxs) {
      return;
    }

    const lastPublished = await this.rollupDb.getSettledRollups(0, true, 1);
    if (!lastPublished.length) {
      return;
    }

    return moment(lastPublished[0].created).add(this.config.publishInterval).toDate();
  }

  public async getPendingNoteNullifiers() {
    return this.rollupDb.getPendingNoteNullifiers();
  }

  public async getBlocks(from: number): Promise<Block[]> {
    const rollups = await this.rollupDb.getSettledRollups(from);
    return rollups.map(dao => ({
      txHash: new TxHash(dao.ethTxHash!),
      created: dao.created,
      rollupId: dao.id,
      rollupSize: RollupProofData.getRollupSizeFromBuffer(dao.rollupProof.proofData!),
      rollupProofData: dao.rollupProof.proofData!,
      viewingKeysData: dao.viewingKeys,
      gasPrice: toBigIntBE(dao.gasPrice),
      gasUsed: dao.gasUsed,
    }));
  }

  public async getLatestRollupId() {
    return (await this.rollupDb.getNextRollupId()) - 1;
  }

  public async getLatestRollups(count: number) {
    return this.rollupDb.getRollups(count);
  }

  public async getLatestTxs(count: number) {
    return this.rollupDb.getLatestTxs(count);
  }

  public async getRollup(id: number) {
    return this.rollupDb.getRollup(id);
  }

  public async getTxs(txIds: Buffer[]) {
    return this.rollupDb.getTxsByTxIds(txIds);
  }

  public async getTx(txId: Buffer) {
    return this.rollupDb.getTx(txId);
  }

  public async receiveTx(tx: Tx) {
    const end = this.metrics.receiveTxTimer();
    const start = new Date().getTime();
    const result = await this.txReceiver.receiveTx(tx);
    console.log(`Received tx in ${new Date().getTime() - start}ms`);
    end();
    return result;
  }

  public flushTxs() {
    console.log('Flushing queued transactions...');
    this.worldState.flushTxs();
  }
}

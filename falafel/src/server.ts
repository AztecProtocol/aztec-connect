import { emptyDir } from 'fs-extra';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { RollupProviderStatus } from 'barretenberg/rollup_provider';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumProvider } from 'blockchain';
import { Duration } from 'moment';
import { RollupDb } from './rollup_db';
import { Tx, TxReceiver } from './tx_receiver';
import { WorldState } from './world_state';
import moment from 'moment';
import { Metrics } from './metrics';
import { Blockchain } from 'barretenberg/blockchain';
import { Block } from 'barretenberg/block_source';
import { toBigIntBE } from 'bigint-buffer';
import { TxHash } from 'barretenberg/tx_hash';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { ProofGenerator, ServerProofGenerator } from 'halloumi/proof_generator';
import { TxFeeResolver } from './tx_fee_resolver';
import { RollupPipelineFactory } from './rollup_pipeline';

export interface ServerConfig {
  readonly halloumiHost: string;
  readonly numInnerRollupTxs: number;
  readonly numOuterRollupProofs: number;
  readonly publishInterval: Duration;
  readonly gasLimit?: number;
  readonly baseTxGas: number;
  readonly feeGasPrice: bigint;
  readonly reimbursementFeeLimit: bigint;
}

export class Server {
  private worldState: WorldState;
  private txReceiver: TxReceiver;
  private txFeeResolver: TxFeeResolver;
  private pipelineFactory: RollupPipelineFactory;
  private proofGenerator: ProofGenerator;
  private ready = false;

  constructor(
    private config: ServerConfig,
    private blockchain: Blockchain,
    private rollupDbRead: RollupDb,
    rollupDbWrite: RollupDb,
    worldStateDb: WorldStateDb,
    private metrics: Metrics,
    provider: EthereumProvider,
    barretenberg: BarretenbergWasm,
  ) {
    const {
      numInnerRollupTxs,
      numOuterRollupProofs,
      publishInterval,
      reimbursementFeeLimit,
      baseTxGas,
      feeGasPrice,
    } = config;

    this.proofGenerator = new ServerProofGenerator(config.halloumiHost);
    this.pipelineFactory = new RollupPipelineFactory(
      this.proofGenerator,
      blockchain,
      rollupDbWrite,
      worldStateDb,
      metrics,
      provider,
      publishInterval,
      reimbursementFeeLimit,
      numInnerRollupTxs,
      numOuterRollupProofs,
    );
    this.worldState = new WorldState(rollupDbWrite, worldStateDb, blockchain, this.pipelineFactory, metrics);
    this.txFeeResolver = new TxFeeResolver(blockchain, baseTxGas, feeGasPrice);
    this.txReceiver = new TxReceiver(barretenberg, rollupDbWrite, blockchain, this.proofGenerator, this.txFeeResolver);
  }

  public async start() {
    console.log('Server initializing...');

    console.log('Waiting until halloumi is ready...');
    await this.proofGenerator.awaitReady();

    await this.txFeeResolver.init();
    await this.worldState.start();
    await this.txReceiver.init();

    this.ready = true;
    console.log('Server ready to receive txs.');
  }

  public async stop() {
    console.log('Server stop...');
    this.ready = false;
    await this.txReceiver.destroy();
    await this.worldState.stop();
  }

  public getPendingTxCount() {
    return this.rollupDbRead.getPendingTxCount();
  }

  public isReady() {
    return this.ready;
  }

  public async removeData() {
    console.log('Removing data dir and signal to shutdown...');
    await emptyDir('./data');
    process.kill(process.pid, 'SIGINT');
  }

  public async resetPipline() {
    console.log('Resetting pipeline...');
    await this.worldState.resetPipeline();
  }

  public async getStatus(): Promise<RollupProviderStatus> {
    const status = await this.blockchain.getBlockchainStatus();

    return {
      blockchainStatus: status,
      minFees: this.txFeeResolver.getTxFees(),
      nextPublishTime: await this.getNextPublishTime(),
      pendingTxCount: await this.getPendingTxCount(),
      txsPerRollup: this.config.numInnerRollupTxs * this.config.numOuterRollupProofs,
    };
  }

  private async getNextPublishTime() {
    return moment(await this.worldState.getLastPublishedTime())
      .add(this.config.publishInterval)
      .toDate();
  }

  public async getPendingNoteNullifiers() {
    return this.rollupDbRead.getPendingNoteNullifiers();
  }

  public async getBlocks(from: number): Promise<Block[]> {
    const { nextRollupId } = await this.blockchain.getBlockchainStatus();
    if (from >= nextRollupId) {
      return [];
    }

    const rollups = await this.rollupDbRead.getSettledRollups(from);
    return rollups.map(dao => {
      if (!dao.rollupProof) {
        console.log(dao);
      }
      return {
        txHash: new TxHash(dao.ethTxHash!),
        created: dao.created,
        rollupId: dao.id,
        rollupSize: RollupProofData.getRollupSizeFromBuffer(dao.rollupProof.proofData!),
        rollupProofData: dao.rollupProof.proofData!,
        viewingKeysData: dao.viewingKeys,
        gasPrice: toBigIntBE(dao.gasPrice),
        gasUsed: dao.gasUsed,
      };
    });
  }

  public async getLatestRollupId() {
    return (await this.rollupDbRead.getNextRollupId()) - 1;
  }

  public async getLatestRollups(count: number) {
    return this.rollupDbRead.getRollups(count);
  }

  public async getLatestTxs(count: number) {
    return this.rollupDbRead.getLatestTxs(count);
  }

  public async getRollup(id: number) {
    return this.rollupDbRead.getRollup(id);
  }

  public async getTxs(txIds: Buffer[]) {
    return this.rollupDbRead.getTxsByTxIds(txIds);
  }

  public async getTx(txId: Buffer) {
    return this.rollupDbRead.getTx(txId);
  }

  public async receiveTx(tx: Tx) {
    const end = this.metrics.receiveTxTimer();
    const start = new Date().getTime();
    const result = await this.txReceiver.receiveTx(tx);
    console.log(
      `Received tx in ${new Date().getTime() - start}ms (unsettled: ${await this.rollupDbRead.getUnsettledTxCount()})`,
    );
    end();
    return result;
  }

  public flushTxs() {
    console.log('Flushing queued transactions...');
    this.worldState.flushTxs();
  }

  public setTopology(numOuterRollupProofs: number) {
    this.pipelineFactory.setTopology(this.config.numInnerRollupTxs, numOuterRollupProofs);
  }
}

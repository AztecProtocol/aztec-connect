import { emptyDir } from 'fs-extra';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { RollupProviderStatus, RuntimeConfig } from 'barretenberg/rollup_provider';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumProvider } from 'blockchain';
import { Duration } from 'moment';
import { RollupDb } from './rollup_db';
import { Tx, TxReceiver } from './tx_receiver';
import { WorldState } from './world_state';
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
  readonly baseTxGas: number;
  readonly maxFeeGasPrice: bigint;
  readonly feeGasPriceMultiplier: number;
  readonly maxProviderGasPrice: bigint;
  readonly providerGasPriceMultiplier: number;
  readonly reimbursementFeeLimit: bigint;
  readonly maxUnsettledTxs: number;
}

export class Server {
  private worldState: WorldState;
  private txReceiver: TxReceiver;
  private txFeeResolver: TxFeeResolver;
  private pipelineFactory: RollupPipelineFactory;
  private proofGenerator: ProofGenerator;
  private runtimeConfig: RuntimeConfig;

  constructor(
    private config: ServerConfig,
    private blockchain: Blockchain,
    private rollupDb: RollupDb,
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
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      maxProviderGasPrice,
      providerGasPriceMultiplier,
    } = config;

    this.runtimeConfig = {
      ready: false,
      useKeyCache: true,
      numOuterRollupProofs,
    };

    this.txFeeResolver = new TxFeeResolver(
      blockchain,
      baseTxGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      numInnerRollupTxs * numOuterRollupProofs,
      publishInterval.asSeconds(),
    );
    this.proofGenerator = new ServerProofGenerator(config.halloumiHost);
    this.pipelineFactory = new RollupPipelineFactory(
      this.proofGenerator,
      blockchain,
      rollupDb,
      worldStateDb,
      metrics,
      provider,
      publishInterval,
      reimbursementFeeLimit,
      maxProviderGasPrice,
      providerGasPriceMultiplier,
      numInnerRollupTxs,
      numOuterRollupProofs,
      this.txFeeResolver,
    );
    this.worldState = new WorldState(rollupDb, worldStateDb, blockchain, this.pipelineFactory, metrics);
    this.txReceiver = new TxReceiver(
      barretenberg,
      rollupDb,
      blockchain,
      this.proofGenerator,
      this.txFeeResolver,
      metrics,
    );
  }

  public async start() {
    console.log('Server initializing...');

    console.log('Waiting until halloumi is ready...');
    await this.proofGenerator.awaitReady();

    await this.txFeeResolver.start();
    await this.worldState.start();
    await this.txReceiver.init();

    this.runtimeConfig.ready = true;
    console.log('Server ready to receive txs.');
  }

  public async stop() {
    console.log('Server stop...');
    this.runtimeConfig.ready = false;
    await this.txReceiver.destroy();
    await this.worldState.stop();
    await this.txFeeResolver.stop();
  }

  public getUnsettledTxCount() {
    return this.rollupDb.getUnsettledTxCount();
  }

  public getRuntimeConfig() {
    return this.runtimeConfig;
  }

  public setRuntimeConfig(config: Partial<RuntimeConfig>) {
    this.runtimeConfig = {
      ...this.runtimeConfig,
      ...config,
    };

    if (config.numOuterRollupProofs !== undefined) {
      this.pipelineFactory.setTopology(this.config.numInnerRollupTxs, config.numOuterRollupProofs);
    }
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
      txFees: status.assets.map((_, i) => this.txFeeResolver.getFeeQuotes(i)),
      nextPublishTime: this.worldState.getNextPublishTime(),
      pendingTxCount: await this.rollupDb.getUnsettledTxCount(),
      runtimeConfig: this.runtimeConfig,
    };
  }

  public async getUnsettledTxs() {
    const txs = (
      await Promise.all([this.rollupDb.getUnsettledAccountTxs(), this.rollupDb.getUnsettledJoinSplitTxs()])
    ).flat();
    return txs.map(tx => tx.id);
  }

  public async getUnsettledNullifiers() {
    return this.rollupDb.getUnsettledNullifiers();
  }

  public async getBlocks(from: number): Promise<Block[]> {
    const { nextRollupId } = await this.blockchain.getBlockchainStatus();
    if (from >= nextRollupId) {
      return [];
    }

    const rollups = await this.rollupDb.getSettledRollups(from);
    return rollups.map(dao => {
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
    return (await this.rollupDb.getNextRollupId()) - 1;
  }

  public async receiveTx(tx: Tx) {
    const { maxUnsettledTxs } = this.config;
    const unsettled = await this.getUnsettledTxCount();
    if (maxUnsettledTxs && unsettled >= maxUnsettledTxs) {
      throw new Error('Too many transactions awaiting settlement. Try again later.');
    }

    const start = new Date().getTime();
    const end = this.metrics.receiveTxTimer();
    const result = await this.txReceiver.receiveTx(tx);
    end();
    console.log(`Received tx in ${new Date().getTime() - start}ms.`);
    return result;
  }

  public flushTxs() {
    console.log('Flushing queued transactions...');
    this.worldState.flushTxs();
  }
}

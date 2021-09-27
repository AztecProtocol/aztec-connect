import { EthAddress } from '@aztec/barretenberg/address';
import { Blockchain } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProviderStatus } from '@aztec/barretenberg/rollup_provider';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { emptyDir } from 'fs-extra';
import { CliProofGenerator, ProofGenerator, ServerProofGenerator } from 'halloumi/proof_generator';
import { Duration } from 'moment';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';
import { parseInteractionResult } from './rollup_db/parse_interaction_result';
import { RollupPipelineFactory } from './rollup_pipeline';
import { TxFeeResolver } from './tx_fee_resolver';
import { Tx, TxReceiver } from './tx_receiver';
import { WorldState } from './world_state';

export interface ServerConfig {
  readonly halloumiHost?: string;
  readonly numInnerRollupTxs: number;
  readonly numOuterRollupProofs: number;
  readonly publishInterval: Duration;
  readonly gasLimit?: number;
  readonly baseTxGas: number;
  readonly maxFeeGasPrice: bigint;
  readonly feeGasPriceMultiplier: number;
  readonly maxProviderGasPrice: bigint;
  readonly providerGasPriceMultiplier: number;
  readonly reimbursementFeeLimit: bigint;
  readonly maxUnsettledTxs: number;
  readonly signingAddress: EthAddress;
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
      halloumiHost,
      signingAddress,
    } = config;
    const noteAlgo = new NoteAlgorithms(barretenberg);

    this.txFeeResolver = new TxFeeResolver(
      blockchain,
      baseTxGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      numInnerRollupTxs * numOuterRollupProofs,
      publishInterval.asSeconds(),
    );
    this.proofGenerator = halloumiHost ? new ServerProofGenerator(halloumiHost) : new CliProofGenerator(2 ** 21);
    this.pipelineFactory = new RollupPipelineFactory(
      this.proofGenerator,
      blockchain,
      rollupDb,
      worldStateDb,
      this.txFeeResolver,
      noteAlgo,
      metrics,
      provider,
      signingAddress,
      publishInterval,
      reimbursementFeeLimit,
      maxProviderGasPrice,
      providerGasPriceMultiplier,
      numInnerRollupTxs,
      numOuterRollupProofs,
    );
    this.worldState = new WorldState(rollupDb, worldStateDb, blockchain, this.pipelineFactory, noteAlgo, metrics);
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

    this.ready = true;
    console.log('Server ready to receive txs.');
  }

  public async stop() {
    console.log('Server stop...');
    this.ready = false;
    await this.txReceiver.destroy();
    await this.worldState.stop();
    await this.txFeeResolver.stop();
  }

  public getUnsettledTxCount() {
    return this.rollupDb.getUnsettledTxCount();
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
      txFees: status.assets.map((_, i) => this.txFeeResolver.getFeeQuotes(i)),
      nextPublishTime: this.worldState.getNextPublishTime(),
      pendingTxCount: await this.rollupDb.getUnsettledTxCount(),
    };
  }

  public async getUnsettledTxs() {
    const txs = await this.rollupDb.getUnsettledTxs();
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
    return rollups.map(dao => ({
      txHash: dao.ethTxHash!,
      created: dao.created,
      rollupId: dao.id,
      rollupSize: RollupProofData.getRollupSizeFromBuffer(dao.rollupProof.proofData!),
      rollupProofData: dao.rollupProof.proofData!,
      offchainTxData: dao.rollupProof.txs.map(tx => tx.offchainTxData),
      interactionResult: parseInteractionResult(dao.interactionResult!),
      gasPrice: toBigIntBE(dao.gasPrice!),
      gasUsed: dao.gasUsed!,
    }));
  }

  public async getLatestRollupId() {
    return (await this.rollupDb.getNextRollupId()) - 1;
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

  public setTopology(numOuterRollupProofs: number) {
    this.pipelineFactory.setTopology(this.config.numInnerRollupTxs, numOuterRollupProofs);
  }
}

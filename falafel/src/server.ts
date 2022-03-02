import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { Blockchain } from '@aztec/barretenberg/blockchain';
import { BridgeConfig, BridgeStatus, convertToBridgeStatus } from '@aztec/barretenberg/bridge_id';
import { Blake2s } from '@aztec/barretenberg/crypto';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { InitialWorldState, RollupProviderStatus, RuntimeConfig } from '@aztec/barretenberg/rollup_provider';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { emptyDir } from 'fs-extra';
import { CliProofGenerator, HttpJobServer, HttpJobServers, ProofGenerator } from 'halloumi/proof_generator';
import { BridgeResolver } from './bridge';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';
import { RollupPipelineFactory } from './rollup_pipeline';
import { TxFeeResolver } from './tx_fee_resolver';
import { WorldState } from './world_state';
import { Configurator } from './configurator';
import { Tx, TxReceiver } from './tx_receiver';
import { BridgeProfile } from './pipeline_coordinator/rollup_profiler';

export class Server {
  private blake: Blake2s;
  private worldState: WorldState;
  private txReceiver: TxReceiver;
  private txFeeResolver: TxFeeResolver;
  private pipelineFactory: RollupPipelineFactory;
  private proofGenerator: ProofGenerator;
  private ready = false;

  constructor(
    private configurator: Configurator,
    signingAddress: EthAddress,
    private bridgeConfigs: BridgeConfig[],
    private blockchain: Blockchain,
    private rollupDb: RollupDb,
    worldStateDb: WorldStateDb,
    private metrics: Metrics,
    barretenberg: BarretenbergWasm,
  ) {
    const {
      proofGeneratorMode,
      numInnerRollupTxs,
      numOuterRollupProofs,
      proverless,
      feePayingAssetAddresses,
      runtimeConfig: {
        publishInterval,
        baseTxGas,
        maxFeeGasPrice,
        feeGasPriceMultiplier,
        maxProviderGasPrice,
        gasLimit,
      },
    } = configurator.getConfVars();

    const noteAlgo = new NoteAlgorithms(barretenberg);
    this.blake = new Blake2s(barretenberg);

    const bridgeResolver = new BridgeResolver(bridgeConfigs, blockchain);

    this.txFeeResolver = new TxFeeResolver(
      blockchain,
      bridgeResolver,
      baseTxGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      numInnerRollupTxs * numOuterRollupProofs,
      publishInterval,
      feePayingAssetAddresses,
    );

    switch (proofGeneratorMode) {
      case 'split':
        this.proofGenerator = new HttpJobServers();
        break;
      case 'local':
        this.proofGenerator = new CliProofGenerator(2 ** 25, 28, 32, proverless, true, false, './data');
        break;
      default:
        this.proofGenerator = new HttpJobServer();
    }

    this.pipelineFactory = new RollupPipelineFactory(
      this.proofGenerator,
      blockchain,
      rollupDb,
      worldStateDb,
      this.txFeeResolver,
      noteAlgo,
      metrics,
      signingAddress,
      publishInterval,
      maxProviderGasPrice,
      gasLimit,
      numInnerRollupTxs,
      numOuterRollupProofs,
      bridgeResolver,
    );
    this.worldState = new WorldState(rollupDb, worldStateDb, blockchain, this.pipelineFactory, noteAlgo, metrics);
    this.txReceiver = new TxReceiver(
      barretenberg,
      noteAlgo,
      rollupDb,
      blockchain,
      this.proofGenerator,
      this.txFeeResolver,
      metrics,
      bridgeResolver,
    );
  }

  public async start() {
    console.log('Server initializing...');

    console.log('Waiting until halloumi is ready...');
    await this.proofGenerator.start();

    await this.txFeeResolver.start();
    await this.worldState.start();
    await this.txReceiver.init();

    this.ready = true;
    console.log('Server ready to receive txs.');
  }

  public async stop() {
    console.log('Server stop...');

    this.proofGenerator.stop();

    this.ready = false;
    await this.txReceiver.destroy();
    await this.worldState.stop();
    await this.txFeeResolver.stop();
  }

  public isReady() {
    return this.ready && this.configurator.getConfVars().runtimeConfig.acceptingTxs;
  }

  public getUnsettledTxCount() {
    return this.rollupDb.getUnsettledTxCount();
  }

  public async setRuntimeConfig(config: Partial<RuntimeConfig>) {
    await this.configurator.saveRuntimeConfig(config);
    const {
      runtimeConfig: {
        baseTxGas,
        maxFeeGasPrice,
        feeGasPriceMultiplier,
        publishInterval,
        maxProviderGasPrice,
        gasLimit,
      },
    } = this.configurator.getConfVars();
    this.pipelineFactory.setConf(publishInterval, maxProviderGasPrice, gasLimit);
    this.txFeeResolver.setConf(baseTxGas, maxFeeGasPrice, feeGasPriceMultiplier, publishInterval);
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
    const nextPublish = this.worldState.getNextPublishTime();
    const txPoolProfile = this.worldState.getTxPoolProfile();
    const bridgeStats: BridgeStatus[] = [];
    for (const bc of this.bridgeConfigs) {
      const rt = nextPublish.bridgeTimeouts.get(bc.bridgeId);
      let gasAccrued = 0n;
      const nextRollupBridgeProfile = txPoolProfile.nextRollupProfile.bridgeProfiles.get(bc.bridgeId);
      const pendingBridgeProfile = txPoolProfile.pendingBridgeStats.get(bc.bridgeId);
      if (nextRollupBridgeProfile) {
        gasAccrued = nextRollupBridgeProfile!.gasAccrued;
      } else if (pendingBridgeProfile && pendingBridgeProfile.gasAccrued) {
        gasAccrued = pendingBridgeProfile.gasAccrued;
      }

      const bs = convertToBridgeStatus(
        bc,
        rt?.rollupNumber,
        rt?.timeout,
        gasAccrued,
        this.txFeeResolver.getFullBridgeGas(bc.bridgeId),
      );
      bridgeStats.push(bs);
    }

    const { runtimeConfig, proverless } = this.configurator.getConfVars();

    return {
      blockchainStatus: status,
      pendingTxCount: await this.rollupDb.getUnsettledTxCount(),
      runtimeConfig,
      nextPublishTime: nextPublish.baseTimeout ? nextPublish.baseTimeout.timeout : new Date(0),
      nextPublishNumber: nextPublish.baseTimeout ? nextPublish.baseTimeout.rollupNumber : 0,
      bridgeStatus: bridgeStats,
      proverless,
    };
  }

  public getTxFees(assetId: number) {
    return this.txFeeResolver.getTxFees(assetId);
  }

  public getDefiFees(bridgeId: bigint) {
    return this.txFeeResolver.getDefiFees(bridgeId);
  }

  public async getInitialWorldState(): Promise<InitialWorldState> {
    const chainId = await this.blockchain.getChainId();
    const accountFileName = InitHelpers.getAccountDataFile(chainId);
    const initialAccounts = accountFileName ? await InitHelpers.readData(accountFileName) : Buffer.alloc(0);
    return { initialAccounts };
  }

  public async getUnsettledTxs() {
    return this.rollupDb.getUnsettledTxs();
  }

  public async getUnsettledNullifiers() {
    return this.rollupDb.getUnsettledNullifiers();
  }

  public async getLatestAccountNonce(accountPublicKey: GrumpkinAddress) {
    return this.rollupDb.getLatestAccountNonce(accountPublicKey);
  }

  public async getLatestAliasNonce(alias: string) {
    const aliasHash = AliasHash.fromAlias(alias, this.blake);
    return this.rollupDb.getLatestAliasNonce(aliasHash);
  }

  public async getAccountId(alias: string, nonce?: number) {
    const aliasHash = AliasHash.fromAlias(alias, this.blake);
    return this.rollupDb.getAccountId(aliasHash, nonce);
  }

  public async getUnsettledAccountTxs() {
    return this.rollupDb.getUnsettledAccountTxs();
  }

  public async getUnsettledPaymentTxs() {
    return this.rollupDb.getUnsettledPaymentTxs();
  }

  public getBlockBuffers(from: number) {
    return this.worldState.getBlockBuffers(from);
  }

  public async getLatestRollupId() {
    return (await this.rollupDb.getNextRollupId()) - 1;
  }

  public async receiveTxs(txs: Tx[]) {
    const { maxUnsettledTxs } = this.configurator.getConfVars().runtimeConfig;
    const unsettled = await this.getUnsettledTxCount();
    if (maxUnsettledTxs && unsettled >= maxUnsettledTxs) {
      throw new Error('Too many transactions awaiting settlement. Try again later.');
    }

    const start = new Date().getTime();
    const end = this.metrics.receiveTxTimer();
    const result = await this.txReceiver.receiveTxs(txs);
    end();
    console.log(`Received tx in ${new Date().getTime() - start}ms.`);
    return result;
  }

  public flushTxs() {
    console.log('Flushing queued transactions...');
    this.worldState.flushTxs();
  }
}

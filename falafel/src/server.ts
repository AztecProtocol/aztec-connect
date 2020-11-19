import { EthAddress } from 'barretenberg/address';
import { emptyDir } from 'fs-extra';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { Block, Blockchain } from 'blockchain';
import { Duration } from 'moment';
import { ProofGenerator } from './proof_generator';
import { RollupDb } from './rollup_db';
import { Tx, TxReceiver } from './tx_receiver';
import { RollupCreator } from './rollup_creator';
import { TxAggregator } from './tx_aggregator';
import { WorldState } from './world_state';
import { RollupPublisher } from './rollup_publisher';

export interface ServerConfig {
  readonly rollupSize: number;
  readonly maxRollupWaitTime: Duration;
  readonly minRollupInterval: Duration;
  readonly signingAddress?: EthAddress;
}

export class Server {
  private worldState: WorldState;
  private txReceiver: TxReceiver;

  constructor(
    private config: ServerConfig,
    private blockchain: Blockchain,
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
  ) {
    const { rollupSize, minRollupInterval, maxRollupWaitTime } = config;
    if (!rollupSize) {
      throw new Error('Rollup size must be greater than 0.');
    }

    if (minRollupInterval.asSeconds() > maxRollupWaitTime.asSeconds()) {
      throw new Error('minRollupInterval must be <= maxRollupWaitTime');
    }

    const rollupPublisher = new RollupPublisher(rollupDb, blockchain, this.config.signingAddress);
    const proofGenerator = new ProofGenerator(rollupSize);
    const rollupCreator = new RollupCreator(rollupDb, worldStateDb, proofGenerator, rollupPublisher, rollupSize);
    const txAggregator = new TxAggregator(rollupCreator, rollupDb, rollupSize, maxRollupWaitTime, minRollupInterval);
    this.worldState = new WorldState(rollupDb, worldStateDb, blockchain, txAggregator);
    this.txReceiver = new TxReceiver(rollupDb, blockchain);
  }

  public async start() {
    console.log('Server start...');
    await this.worldState.start();
    // The tx receiver depends on the world state to have been initialized to gain access to vks.
    await this.txReceiver.init();
  }

  public async stop() {
    console.log('Server stop...');
    await this.txReceiver.destroy();
    await this.worldState.stop();
  }

  public async removeData() {
    console.log('Removing data dir and signal to shutdown...');
    await emptyDir('./data');
    process.kill(process.pid, 'SIGINT');
  }

  public async getStatus() {
    const {
      chainId,
      networkOrHost,
      rollupContractAddress,
      tokenContractAddresses,
      nextRollupId,
      escapeOpen,
      numEscapeBlocksRemaining,
    } = await this.blockchain.getStatus();

    return {
      serviceName: 'falafel',
      chainId,
      networkOrHost,
      rollupContractAddress,
      tokenContractAddresses,
      dataSize: Number(this.worldStateDb.getSize(0)),
      dataRoot: this.worldStateDb.getRoot(0),
      nullRoot: this.worldStateDb.getRoot(1),
      rootRoot: this.worldStateDb.getRoot(2),
      nextRollupId,
      escapeOpen,
      numEscapeBlocksRemaining,
    };
  }

  public async getNextPublishTime() {
    // TODO: Replace horror show with time till flushTimeout completes?
    const { escapeOpen } = await this.blockchain.getStatus();
    const confirmations = escapeOpen ? 12 : 1;
    const avgSettleTime = (30 + confirmations * 15) * 1000;
    const avgProofTime = 30 * 1000;

    const [pendingRollup] = await this.rollupDb.getUnsettledRollups();
    if (pendingRollup) {
      return new Date(pendingRollup.created.getTime() + avgProofTime + avgSettleTime);
    }

    const [pendingTx] = await this.rollupDb.getPendingTxs();
    if (pendingTx) {
      return new Date(
        pendingTx.created.getTime() + this.config.maxRollupWaitTime.asMilliseconds() + avgProofTime + avgSettleTime,
      );
    }

    return undefined;
  }

  public async getPendingNoteNullifiers() {
    const unsettledTxs = await this.rollupDb.getUnsettledTxs();
    return unsettledTxs.map(tx => [tx.nullifier1, tx.nullifier2]).flat();
  }

  public async getBlocks(from: number): Promise<Block[]> {
    const rollups = await this.rollupDb.getSettledRollupsFromId(from);
    return rollups.map(dao => ({
      txHash: dao.ethTxHash!,
      created: dao.created,
      rollupId: dao.id,
      rollupSize: RollupProofData.getRollupSizeFromBuffer(dao.proofData!),
      rollupProofData: dao.proofData!,
      viewingKeysData: dao.viewingKeys,
    }));
  }

  public async getLatestRollupId() {
    return await this.rollupDb.getLatestSettledRollupId();
  }

  public async getLatestRollups(count: number) {
    return this.rollupDb.getLatestRollups(count);
  }

  public async getLatestTxs(count: number) {
    return this.rollupDb.getLatestTxs(count);
  }

  public async getRollup(id: number) {
    return this.rollupDb.getRollupWithTxs(id);
  }

  public async getTxs(txIds: Buffer[]) {
    return this.rollupDb.getTxsByTxIds(txIds);
  }

  public async getTx(txId: Buffer) {
    return this.rollupDb.getTxByTxId(txId);
  }

  public async receiveTx(tx: Tx) {
    return await this.txReceiver.receiveTx(tx);
  }

  public flushTxs() {
    console.log('Flushing queued transactions...');
    this.worldState.flushTxs();
  }
}

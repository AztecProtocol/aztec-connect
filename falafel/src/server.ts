import { EthAddress } from 'barretenberg/address';
import { emptyDir } from 'fs-extra';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { TxHash } from 'barretenberg/rollup_provider';
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
import { RollupAggregator } from './rollup_aggregator';
import moment from 'moment';

export interface ServerConfig {
  readonly innerRollupSize: number;
  readonly outerRollupSize: number;
  readonly publishInterval: Duration;
  readonly signingAddress?: EthAddress;
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
  ) {
    const { innerRollupSize, outerRollupSize, publishInterval, signingAddress } = config;

    this.proofGenerator = new ProofGenerator(innerRollupSize, outerRollupSize);
    const rollupPublisher = new RollupPublisher(rollupDb, blockchain, publishInterval, signingAddress);
    const rollupAggregator = new RollupAggregator(
      this.proofGenerator,
      rollupPublisher,
      rollupDb,
      worldStateDb,
      innerRollupSize,
      outerRollupSize,
    );
    const rollupCreator = new RollupCreator(
      rollupDb,
      worldStateDb,
      this.proofGenerator,
      rollupAggregator,
      innerRollupSize,
    );
    const txAggregator = new TxAggregator(rollupCreator, rollupDb, innerRollupSize, publishInterval);
    this.worldState = new WorldState(rollupDb, worldStateDb, blockchain, txAggregator);
    this.txReceiver = new TxReceiver(rollupDb, blockchain);
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

  public async getStatus() {
    const status = await this.blockchain.getStatus();

    return {
      ...status,
      serviceName: 'falafel',
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

    return moment(lastPublished[0].created).add(this.config.publishInterval).toDate().getTime();
  }

  public async getPendingNoteNullifiers() {
    const unsettledTxs = await this.rollupDb.getPendingTxs();
    return unsettledTxs.map(tx => [tx.nullifier1, tx.nullifier2]).flat();
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
    return await this.txReceiver.receiveTx(tx);
  }

  public flushTxs() {
    console.log('Flushing queued transactions...');
    this.worldState.flushTxs();
  }
}

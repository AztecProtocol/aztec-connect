import { MemoryFifo } from 'barretenberg/fifo';
import { InnerProofData, RollupProofData } from 'barretenberg/rollup_proof';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { Block, Blockchain } from 'blockchain';
import { RollupDao } from './entity/rollup';
import { TxDao } from './entity/tx';
import { RollupDb } from './rollup_db';
import { TxAggregator } from './tx_aggregator';

const innerProofDataToTxDao = (tx: InnerProofData, viewingKeys: Buffer[]) => {
  const txDao = new TxDao();
  txDao.txId = tx.txId;
  txDao.proofData = tx.toBuffer();
  txDao.viewingKey1 = viewingKeys[0];
  txDao.viewingKey2 = viewingKeys[1];
  txDao.nullifier1 = tx.nullifier1;
  txDao.nullifier2 = tx.nullifier2;
  txDao.created = new Date();
  return txDao;
};

export class WorldState {
  private blockQueue = new MemoryFifo<Block>();

  constructor(
    public rollupDb: RollupDb,
    public worldStateDb: WorldStateDb,
    private blockchain: Blockchain,
    private txAggregator: TxAggregator,
  ) {}

  public async start() {
    await this.worldStateDb.start();

    await this.syncState();

    await this.txAggregator.init();
    this.txAggregator.start();

    this.blockchain.on('block', block => this.blockQueue.put(block));
    await this.blockchain.start(await this.rollupDb.getNextRollupId());

    this.blockQueue.process(block => this.handleBlock(block));
  }

  public async stop() {
    this.blockQueue.cancel();
    this.blockchain.stop();
    await this.txAggregator.stop();
    this.txAggregator.destroy();
    this.worldStateDb.stop();
  }

  public flushTxs() {
    this.txAggregator.flushTxs();
  }

  /**
   * Processes all rollup blocks from the last settled rollup in the rollup db.
   * Called at startup to bring us back in sync.
   */
  private async syncState() {
    console.log('Syncing state...');
    const nextRollupId = await this.rollupDb.getNextRollupId();
    const blocks = await this.blockchain.getBlocks(nextRollupId);

    for (const block of blocks) {
      await this.updateDbs(block);
    }

    await this.rollupDb.deleteUnsettledRollups();

    console.log('Sync complete.');
  }

  public printState() {
    console.log(`Data size: ${this.worldStateDb.getSize(0)}`);
    console.log(`Data root: ${this.worldStateDb.getRoot(0).toString('hex')}`);
    console.log(`Null root: ${this.worldStateDb.getRoot(1).toString('hex')}`);
    console.log(`Root root: ${this.worldStateDb.getRoot(2).toString('hex')}`);
  }

  private async handleBlock(block: Block) {
    await this.txAggregator.stop();
    await this.updateDbs(block);
    this.txAggregator.start();
  }

  /**
   * Inserts the rollup in the given block into the merkle tree and sql db.
   */
  private async updateDbs(block: Block) {
    const { rollupProofData, viewingKeysData } = block;
    const rollup = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);

    // const existingRollup = await this.rollupDb.getRollupFromHash(rollup.rollupHash);
    // if (existingRollup && existingRollup.status === 'SETTLED') {
    //   return;
    // }

    console.log(`Processing rollup ${rollup.rollupId}: ${rollup.rollupHash.toString('hex')}...`);
    await this.addRollupToWorldState(rollup);
    await this.confirmOrAddRollupToDb(rollup, block);

    await this.printState();
  }

  private async confirmOrAddRollupToDb(rollup: RollupProofData, block: Block) {
    const { txHash, rollupProofData } = block;
    if (await this.rollupDb.getRollupFromHash(rollup.rollupHash)) {
      await this.rollupDb.confirmRollup(rollup.rollupId);
    } else {
      // Not a rollup we created. Add or replace rollup.
      const rollupDao = new RollupDao();
      rollupDao.id = rollup.rollupId;
      rollupDao.hash = rollup.rollupHash;
      rollupDao.ethTxHash = txHash;
      rollupDao.dataRoot = rollup.newDataRoot;
      rollupDao.proofData = rollupProofData;
      rollupDao.txs = [];
      rollupDao.status = 'SETTLED';
      rollupDao.created = block.created;
      rollupDao.viewingKeys = rollup.getViewingKeyData();

      for (let i = 0; i < rollup.innerProofData.length; ++i) {
        const txDao = innerProofDataToTxDao(rollup.innerProofData[i], rollup.viewingKeys[i]);
        txDao.rollup = rollupDao;
        rollupDao.txs.push(txDao);
      }

      await this.rollupDb.addRollupDao(rollupDao);
    }
  }

  private async addRollupToWorldState(rollup: RollupProofData) {
    const { rollupId, rollupSize, dataStartIndex, innerProofData } = rollup;
    for (let i = 0; i < innerProofData.length; ++i) {
      const tx = innerProofData[i];
      await this.worldStateDb.put(0, BigInt(dataStartIndex + i * rollupSize), tx.newNote1);
      await this.worldStateDb.put(0, BigInt(dataStartIndex + i * rollupSize + 1), tx.newNote2);
      await this.worldStateDb.put(1, toBigIntBE(tx.nullifier1), toBufferBE(1n, 64));
      await this.worldStateDb.put(1, toBigIntBE(tx.nullifier2), toBufferBE(1n, 64));
    }
    if (innerProofData.length < rollupSize) {
      await this.worldStateDb.put(0, BigInt(dataStartIndex + rollupSize * 2 - 1), Buffer.alloc(64, 0));
    }
    await this.worldStateDb.put(2, BigInt(rollupId + 1), this.worldStateDb.getRoot(0));

    await this.worldStateDb.commit();
  }
}

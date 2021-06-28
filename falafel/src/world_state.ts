import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { NoteAlgorithms, TreeClaimNote } from '@aztec/barretenberg/note_algorithms';
import { DefiDepositProofData, InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { getTxTypeFromInnerProofData } from './get_tx_type';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';
import { RollupPipeline, RollupPipelineFactory } from './rollup_pipeline';

const innerProofDataToTxDao = (tx: InnerProofData, viewingKeys: ViewingKey[], created: Date, txType: TxType) => {
  const txDao = new TxDao();
  txDao.id = tx.txId;
  txDao.proofData = tx.toBuffer();
  txDao.viewingKey1 = viewingKeys[0];
  txDao.viewingKey2 = viewingKeys[1];
  txDao.nullifier1 = tx.nullifier1;
  txDao.nullifier2 = tx.nullifier2;
  txDao.created = created;
  txDao.mined = created;
  txDao.txType = txType;
  return txDao;
};

export class WorldState {
  private blockQueue = new MemoryFifo<Block>();
  private pipeline!: RollupPipeline;

  constructor(
    public rollupDb: RollupDb,
    public worldStateDb: WorldStateDb,
    private blockchain: Blockchain,
    private pipelineFactory: RollupPipelineFactory,
    private noteAlgo: NoteAlgorithms,
    private metrics: Metrics,
  ) {}

  public async start() {
    await this.worldStateDb.start();

    await this.syncState();

    await this.startNewPipeline();

    this.blockchain.on('block', block => this.blockQueue.put(block));
    await this.blockchain.start(await this.rollupDb.getNextRollupId());

    this.blockQueue.process(block => this.handleBlock(block));
  }

  public getNextPublishTime() {
    return this.pipeline.getNextPublishTime();
  }

  public async stop() {
    this.blockQueue.cancel();
    this.blockchain.stop();
    await this.pipeline.stop();
    this.worldStateDb.stop();
  }

  public flushTxs() {
    this.pipeline.flushTxs();
  }

  /**
   * Called at startup to bring us back in sync.
   * Erases any orphaned rollup proofs and unsettled rollups from rollup db.
   * Processes all rollup blocks from the last settled rollup in the rollup db.
   */
  private async syncState() {
    this.printState();
    const nextRollupId = await this.rollupDb.getNextRollupId();
    console.log(`Syncing state from rollup ${nextRollupId}...`);
    const blocks = await this.blockchain.getBlocks(nextRollupId);

    for (const block of blocks) {
      await this.updateDbs(block);
    }

    // This deletes all proofs created until now. Not ideal, figure out a way to resume.
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();

    console.log('Sync complete.');
  }

  public printState() {
    console.log(`Data size: ${this.worldStateDb.getSize(RollupTreeId.DATA)}`);
    console.log(`Data root: ${this.worldStateDb.getRoot(RollupTreeId.DATA).toString('hex')}`);
    console.log(`Null root: ${this.worldStateDb.getRoot(RollupTreeId.NULL).toString('hex')}`);
    console.log(`Root root: ${this.worldStateDb.getRoot(RollupTreeId.ROOT).toString('hex')}`);
    console.log(`Defi root: ${this.worldStateDb.getRoot(RollupTreeId.DEFI).toString('hex')}`);
  }

  /**
   * Called to purge all received, unsettled txs, and reset the rollup pipeline.
   */
  public async resetPipeline() {
    await this.pipeline.stop();
    await this.worldStateDb.rollback();
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();
    await this.rollupDb.deletePendingTxs();
    await this.startNewPipeline();
  }

  private async startNewPipeline() {
    this.pipeline = await this.pipelineFactory.create();
    this.pipeline.start().catch(async err => {
      console.log('PIPELINE PANIC!');
      console.log(err);
    });
  }

  /**
   * Called in serial to process each incoming block.
   * Stops the pipeline, stopping any current rollup construction or publishing.
   * Processes the block, loading it's data into the db.
   * Starts a new pipeline.
   */
  private async handleBlock(block: Block) {
    await this.pipeline.stop();
    await this.updateDbs(block);
    await this.startNewPipeline();
  }

  /**
   * Inserts the rollup in the given block into the merkle tree and sql db.
   */
  private async updateDbs(block: Block) {
    const end = this.metrics.processBlockTimer();
    const { rollupProofData: rawRollupData, viewingKeysData } = block;
    const rollupProofData = RollupProofData.fromBuffer(rawRollupData, viewingKeysData);
    const { rollupId, rollupHash, newDataRoot, newNullRoot, newDataRootsRoot } = rollupProofData;

    console.log(`Processing rollup ${rollupId}: ${rollupHash.toString('hex')}...`);

    if (
      newDataRoot.equals(this.worldStateDb.getRoot(0)) &&
      newNullRoot.equals(this.worldStateDb.getRoot(1)) &&
      newDataRootsRoot.equals(this.worldStateDb.getRoot(2))
    ) {
      // This must be the rollup we just published. Commit the world state.
      await this.worldStateDb.commit();
    } else {
      // Someone elses rollup. Discard any of our world state modifications and update world state with new rollup.
      await this.worldStateDb.rollback();
      await this.addRollupToWorldState(rollupProofData);
    }

    await this.processDefiProofs(rollupProofData, block);

    await this.confirmOrAddRollupToDb(rollupProofData, block);

    this.printState();
    end();
  }

  private async processDefiProofs(rollup: RollupProofData, block: Block) {
    const { innerProofData, dataStartIndex } = rollup;
    const { interactionResult } = block;
    for (let i = 0; i < innerProofData.length; ++i) {
      const proofData = innerProofData[i];
      switch (proofData.proofId) {
        case ProofId.DEFI_DEPOSIT: {
          const { bridgeId, depositValue, partialState } = new DefiDepositProofData(proofData);
          const index = dataStartIndex + i * 2;
          const interactionNonce = interactionResult.find(r => r.bridgeId.equals(bridgeId))!.nonce;
          const note = new TreeClaimNote(depositValue, bridgeId, interactionNonce, partialState);
          const nullifier = this.noteAlgo.computeClaimNoteNullifier(this.noteAlgo.commitClaimNote(note), index);
          await this.rollupDb.addClaim({
            id: index,
            nullifier,
            bridgeId: bridgeId.toBigInt(),
            depositValue,
            partialState,
            interactionNonce,
            created: new Date(),
          });
          break;
        }
        case ProofId.DEFI_CLAIM:
          await this.rollupDb.confirmClaimed(proofData.nullifier1, block.created);
          break;
      }
    }
  }

  private async confirmOrAddRollupToDb(rollup: RollupProofData, block: Block) {
    const { txHash, rollupProofData: proofData, created } = block;

    // Get by rollup hash, as a competing rollup may have the same rollup number.
    const rollupProof = await this.rollupDb.getRollupProof(rollup.rollupHash, true);
    if (rollupProof) {
      // Our rollup. Confirm mined and track settlement times.
      const txIds = rollupProof.txs.map(tx => tx.id);
      await this.rollupDb.confirmMined(
        rollup.rollupId,
        block.gasUsed,
        block.gasPrice,
        block.created,
        block.txHash,
        block.interactionResult,
        txIds,
      );

      for (const inner of rollup.innerProofData) {
        if (inner.isPadding()) {
          continue;
        }
        const tx = rollupProof.txs.find(tx => tx.id.equals(inner.txId));
        if (!tx) {
          console.log('Rollup tx missing. Not tracking time...');
          continue;
        }
        this.metrics.txSettlementDuration(block.created.getTime() - tx.created.getTime());
      }
    } else {
      // Not a rollup we created. Add or replace rollup.
      const txs = rollup.innerProofData
        .filter(tx => !tx.isPadding())
        .map((p, i) => innerProofDataToTxDao(p, rollup.viewingKeys[i], created, getTxTypeFromInnerProofData(p)));
      const rollupProofDao = new RollupProofDao({
        id: rollup.rollupHash,
        txs,
        rollupSize: rollup.rollupSize,
        dataStartIndex: rollup.dataStartIndex,
        proofData: proofData,
        created: created,
      });

      const rollupDao = new RollupDao({
        id: rollup.rollupId,
        dataRoot: rollup.newDataRoot,
        rollupProof: rollupProofDao,
        ethTxHash: txHash,
        mined: block.created,
        created: block.created,
        viewingKeys: Buffer.concat(rollup.viewingKeys.flat().map(vk => vk.toBuffer())),
        gasPrice: toBufferBE(block.gasPrice, 32),
        gasUsed: block.gasUsed,
      });

      await this.rollupDb.addRollup(rollupDao);
    }
  }

  private async addRollupToWorldState(rollup: RollupProofData) {
    /*
    const entries: PutEntry[] = [];
    for (let i = 0; i < innerProofData.length; ++i) {
      const tx = innerProofData[i];
      entries.push({ treeId: 0, index: BigInt(dataStartIndex + i * 2), value: tx.newNote1 });
      entries.push({ treeId: 0, index: BigInt(dataStartIndex + i * 2 + 1), value: tx.newNote2 });
      if (!tx.isPadding()) {
        entries.push({ treeId: 1, index: toBigIntBE(tx.nullifier1), value: toBufferBE(1n, 64) });
        entries.push({ treeId: 1, index: toBigIntBE(tx.nullifier2), value: toBufferBE(1n, 64) });
      }
    }
    await this.worldStateDb.batchPut(entries);
    */
    const { rollupId, dataStartIndex, innerProofData } = rollup;
    for (let i = 0; i < innerProofData.length; ++i) {
      const tx = innerProofData[i];
      await this.worldStateDb.put(0, BigInt(dataStartIndex + i * 2), tx.newNote1);
      await this.worldStateDb.put(0, BigInt(dataStartIndex + i * 2 + 1), tx.newNote2);
      if (!tx.isPadding()) {
        await this.worldStateDb.put(1, toBigIntBE(tx.nullifier1), toBufferBE(1n, 64));
        await this.worldStateDb.put(1, toBigIntBE(tx.nullifier2), toBufferBE(1n, 64));
      }
    }

    await this.worldStateDb.put(2, BigInt(rollupId + 1), this.worldStateDb.getRoot(0));

    await this.worldStateDb.commit();
  }
}

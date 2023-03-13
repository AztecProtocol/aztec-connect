import { EthAddress } from '@aztec/barretenberg/address';
import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { DefiDepositProofData, JoinSplitProofData, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { SerialQueue } from '@aztec/barretenberg/fifo';
import { createLogger } from '@aztec/barretenberg/log';
import { DefiInteractionNote, NoteAlgorithms, TreeClaimNote } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiDepositData } from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { BridgePublishQuery } from '@aztec/barretenberg/rollup_provider';
import { serializeBufferArrayToVector } from '@aztec/barretenberg/serialize';
import { Timer } from '@aztec/barretenberg/timer';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { fromBaseUnits } from '@aztec/blockchain';
import { InitAccountFiles } from './environment/index.js';
import {
  AccountDao,
  AssetMetricsDao,
  ClaimDao,
  RollupDao,
  RollupProofDao,
  TxDao,
  BridgeMetricsDao,
} from './entity/index.js';
import { getTxTypeFromInnerProofData } from './get_tx_type.js';
import { Metrics } from './metrics/index.js';
import { createDefiRollupTx } from './pipeline_coordinator/bridge_tx_queue.js';
import { RollupTimeout, RollupTimeouts } from './pipeline_coordinator/publish_time_manager.js';
import { RollupDb } from './rollup_db/index.js';
import { RollupPipeline, RollupPipelineFactory } from './rollup_pipeline.js';
import { TxFeeResolver } from './tx_fee_resolver/index.js';
import { BridgeStatsQueryHandler } from './bridge/bridge_stats_query.js';

const innerProofDataToTxDao = (
  tx: InnerProofData,
  offchainTxData: Buffer,
  created: Date,
  txType: TxType,
  position: number,
) => {
  const txDao = new TxDao();
  txDao.id = tx.txId;
  txDao.proofData = tx.toBuffer();
  txDao.offchainTxData = offchainTxData;
  txDao.nullifier1 = toBigIntBE(tx.nullifier1) ? tx.nullifier1 : undefined;
  txDao.nullifier2 = toBigIntBE(tx.nullifier2) ? tx.nullifier2 : undefined;
  txDao.created = created;
  txDao.mined = created;
  txDao.txType = txType;
  txDao.excessGas = 0;
  txDao.position = position;
  return txDao;
};

interface BridgeStat {
  bridgeCallData: bigint;
  gasAccrued: number;
}

type TxPoolProfile = {
  numTxsInNextRollup: number;
  numTxs: number;
  pendingBridgeStats: BridgeStat[];
  pendingTxCount: number;
  pendingSecondClassTxCount: number;
};

export class WorldState {
  private serialQueue = new SerialQueue();
  private pipeline?: RollupPipeline;
  private txPoolProfile?: Promise<TxPoolProfile>;
  private initialSubtreeRootsCache: Buffer[] = [];
  private bridgeStatsQueryHandler: BridgeStatsQueryHandler;

  constructor(
    public rollupDb: RollupDb,
    public worldStateDb: WorldStateDb,
    private blockchain: Blockchain,
    private pipelineFactory: RollupPipelineFactory,
    private noteAlgo: NoteAlgorithms,
    private metrics: Metrics,
    private txFeeResolver: TxFeeResolver,
    private disablePipeline = false,
    private expireTxPoolAfter = 60 * 1000,
    private log = createLogger('WorldState'),
  ) {
    this.bridgeStatsQueryHandler = new BridgeStatsQueryHandler(rollupDb, txFeeResolver);
  }

  public async start() {
    await this.worldStateDb.start();

    this.serialQueue.start();

    // Syncs rollups that are on-chain but not yet in our db.
    await this.syncState();

    this.startNewPipeline();

    // Subscribe to sync any new rollups.
    this.blockchain.on('block', block => this.serialQueue.put(() => this.handleBlock(block)));
    await this.blockchain.start(await this.rollupDb.getNextRollupId());
  }

  public setTxFeeResolver(txFeeResolver: TxFeeResolver) {
    this.txFeeResolver = txFeeResolver;
  }

  public getRollupSize() {
    return this.pipelineFactory.getRollupSize();
  }

  public getNextPublishTime() {
    if (this.pipeline) {
      return this.pipeline.getNextPublishTime();
    }
    return {
      baseTimeout: undefined,
      bridgeTimeouts: new Map<bigint, RollupTimeout>(),
    } as RollupTimeouts;
  }

  public getInitialStateSubtreeRoots() {
    return this.initialSubtreeRootsCache;
  }

  public async getTxPoolProfile() {
    if (!this.txPoolProfile) {
      this.txPoolProfile = this.computeTxPoolProfile();
    }
    return await this.txPoolProfile;
  }

  public async queryBridgeStats(query: BridgePublishQuery) {
    return await this.bridgeStatsQueryHandler.processBridgeQuery(query);
  }

  public async stop(flushQueue = false) {
    if (flushQueue) {
      await this.serialQueue.end();
    } else {
      await this.serialQueue.cancel();
    }
    await this.blockchain.stop();
    await this.pipeline?.stop(false);
    this.worldStateDb.stop();
  }

  public flushTxs() {
    this.pipeline?.flushTxs();
  }

  private async cacheInitialStateSubtreeRoots() {
    const chainId = await this.blockchain.getChainId();
    const dataSize = InitHelpers.getInitDataSize(chainId);
    const numNotesPerRollup = WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX * this.getRollupSize();
    const numRollups = Math.floor(dataSize / numNotesPerRollup) + (dataSize % numNotesPerRollup ? 1 : 0);
    const subtreeDepth = Math.ceil(Math.log2(numNotesPerRollup));
    for (let i = 0; i < numRollups; i++) {
      const subtreeRoot = await this.worldStateDb.getSubtreeRoot(
        RollupTreeId.DATA,
        BigInt(i * numNotesPerRollup),
        subtreeDepth,
      );
      this.initialSubtreeRootsCache.push(subtreeRoot);
    }
    this.log(`Cached ${this.initialSubtreeRootsCache.length} initial sub-tree roots`);
  }

  private async syncStateFromInitFiles() {
    this.log('Synching state from initialisation files...');

    const chainId = await this.blockchain.getChainId();
    this.log(`Chain id: ${chainId}`);

    const accountDataFile = InitAccountFiles.getAccountDataFile(chainId);
    if (!accountDataFile) {
      this.log(`No account initialisation file for chain ${chainId}.`);
      return;
    }

    const accounts = await InitHelpers.readAccountTreeData(accountDataFile);
    if (accounts.length === 0) {
      this.log('No accounts read from file, continuing without syncing from file.');
      return;
    }
    this.log(`Read ${accounts.length} accounts from file.`);

    if (this.worldStateDb.getSize(RollupTreeId.DATA) === 0n) {
      const {
        dataRoot: initDataRoot,
        nullRoot: initNullRoot,
        rootsRoot: initRootsRoot,
      } = InitHelpers.getInitRoots(chainId);
      if (!initDataRoot.length || !initNullRoot.length || !initRootsRoot.length) {
        this.log('No roots read from file, continuing without syncing from file.');
        return;
      }
      const numNotesPerRollup = WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX * this.getRollupSize();
      const { dataRoot, rootsRoot } = await InitHelpers.populateDataAndRootsTrees(
        accounts,
        this.worldStateDb,
        RollupTreeId.DATA,
        RollupTreeId.ROOT,
        numNotesPerRollup,
      );
      const newNullRoot = await InitHelpers.populateNullifierTree(accounts, this.worldStateDb, RollupTreeId.NULL);
      await this.worldStateDb.commit();

      this.printState();

      if (!initDataRoot.equals(dataRoot)) {
        throw new Error(`New data root different to init file: ${initDataRoot.toString('hex')}`);
      }
      if (!initRootsRoot.equals(rootsRoot)) {
        throw new Error(`New roots root different to init file: ${initRootsRoot.toString('hex')}`);
      }
      if (!initNullRoot.equals(newNullRoot)) {
        throw new Error(`New null root different to init file: ${initNullRoot.toString('hex')}`);
      }
    } else {
      this.log('Data tree already has information. Skipping merkle tree genesis sync.');
    }

    if ((await this.rollupDb.getAccountCount()) === 0) {
      const accountDaos = accounts.map(
        a =>
          new AccountDao({
            accountPublicKey: a.alias.address,
            aliasHash: a.alias.aliasHash,
          }),
      );
      this.log(`Adding ${accountDaos.length} accounts to db...`);
      await this.rollupDb.addAccounts(accountDaos);
    } else {
      this.log('Account db already has entries. Skipping account genesis sync.');
    }
  }

  private async syncStateFromBlockchain(nextRollupId: number) {
    this.log(`Syncing state from rollup ${nextRollupId}...`);

    // Once this returns, all blocks will be on the serialQueue.
    await this.blockchain.callbackRollupBlocksFrom(nextRollupId, block =>
      this.serialQueue.put(() => this.updateDbs(block)),
    );

    // Wait until we've fully processed the serialQueue before continuing.
    await this.serialQueue.syncPoint();
  }

  /**
   * Called at startup to bring us back in sync.
   * Erases any orphaned rollup proofs and unsettled rollups from rollup db.
   * Processes all rollup blocks from the last settled rollup in the rollup db.
   */
  private async syncState() {
    this.printState();

    // Cleanup transient state.
    // TODO: If we can get rid of bridgeMetrics associated to an in-progress rollup, or remove need for that
    // key constraint, we can get rid of unsettled rollups in db altogether.
    // Would also enable to remove branching logic between "our rollup", "someone elses rollup" in processing rollups.
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();

    const nextRollupId = await this.rollupDb.getNextRollupId();
    const updateDbsStart = new Timer();
    if (nextRollupId === 0) {
      await this.syncStateFromInitFiles();
    }
    await this.syncStateFromBlockchain(nextRollupId);
    await this.cacheInitialStateSubtreeRoots();

    this.log(`Database synched in ${updateDbsStart.s()}s.`);
  }

  public printState() {
    this.log(`Data size: ${this.worldStateDb.getSize(RollupTreeId.DATA)}`);
    this.log(`Data root: ${this.worldStateDb.getRoot(RollupTreeId.DATA).toString('hex')}`);
    this.log(`Null root: ${this.worldStateDb.getRoot(RollupTreeId.NULL).toString('hex')}`);
    this.log(`Root root: ${this.worldStateDb.getRoot(RollupTreeId.ROOT).toString('hex')}`);
    this.log(`Defi root: ${this.worldStateDb.getRoot(RollupTreeId.DEFI).toString('hex')}`);
  }

  /**
   * Called to purge all received, unsettled txs, and reset the rollup pipeline.
   */
  public async resetPipeline() {
    await this.pipeline?.stop(true);
    await this.worldStateDb.rollback();
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();
    await this.rollupDb.deletePendingTxs();
    this.startNewPipeline();
  }

  /**
   * Called to restart the pipeline. e.g. If configuration changes and we want a new pipeline immediately.
   */
  public async restartPipeline() {
    await this.pipeline?.stop(true);
    await this.worldStateDb.rollback();
    this.startNewPipeline();
  }

  private startNewPipeline() {
    if (this.disablePipeline) {
      return;
    }
    this.log('Starting new pipeline...');
    this.pipeline = this.pipelineFactory.create();
    this.pipeline.start().catch(err => {
      this.pipeline = undefined;
      this.log('PIPELINE PANIC! Handle the exception!');
      this.log(err);
    });
  }

  /**
   * Called in serial to process each incoming block.
   * Stops the pipeline, stopping any current rollup construction or publishing.
   * Processes the block, loading it's data into the db.
   * Starts a new pipeline.
   */
  private async handleBlock(block: Block) {
    if (this.pipeline) {
      this.log('Stopping existing pipeline...');
      await this.pipeline.stop(false);
    }
    await this.updateDbs(block);
    this.startNewPipeline();
  }

  /**
   * Inserts the rollup in the given block into the merkle tree and sql db.
   */
  private async updateDbs(block: Block) {
    const end = this.metrics.processBlockTimer();
    const { encodedRollupProofData, offchainTxData } = block;
    const decodedRollupProofData = RollupProofData.decode(encodedRollupProofData);
    const { rollupId, rollupHash, newDataRoot, newNullRoot, newDataRootsRoot, newDefiRoot } = decodedRollupProofData;

    const nextExpectedRollupId = await this.rollupDb.getNextRollupId();
    if (rollupId !== nextExpectedRollupId) {
      this.log(`Received rollup ${rollupId} but we were expecting ${nextExpectedRollupId}!! Ignoring rollup.`);
      return;
    }
    this.log(`Processing rollup ${rollupId}: ${rollupHash.toString('hex')}...`);

    const rollupIsOurs =
      newDataRoot.equals(this.worldStateDb.getRoot(RollupTreeId.DATA)) &&
      newNullRoot.equals(this.worldStateDb.getRoot(RollupTreeId.NULL)) &&
      newDataRootsRoot.equals(this.worldStateDb.getRoot(RollupTreeId.ROOT)) &&
      newDefiRoot.equals(this.worldStateDb.getRoot(RollupTreeId.DEFI));

    if (rollupIsOurs) {
      // This must be the rollup we just published. Commit the world state.
      this.log(`World state db already up-to-date. Comitting.`);
      await this.worldStateDb.commit();
    } else {
      // Discard any of our world state modifications and update world state with new rollup.
      this.log(`World state db doesn't match that of rollup. Discarding local changes and recomputing...`);
      await this.worldStateDb.rollback();
      await this.addRollupToWorldState(decodedRollupProofData);
    }

    await this.processDefiProofs(decodedRollupProofData, offchainTxData, block);

    await this.confirmOrAddRollupToDb(decodedRollupProofData, offchainTxData, block);

    if (!rollupIsOurs) {
      await this.purgeInvalidTxs();
    }

    // Purge the bridgeQuery cache.
    this.bridgeStatsQueryHandler.onNewRollup();

    this.printState();
    end();
  }

  private async purgeInvalidTxs() {
    this.log('Purging invalid txs...');
    const pendingTxs = await this.rollupDb.getPendingTxs();
    const txsToPurge = await this.validateTxs(pendingTxs);
    if (txsToPurge.length) {
      await this.rollupDb.deleteTxsById(txsToPurge);
    }
    this.log(`Purged ${txsToPurge.length} txs from pool.`);
  }

  private async validateTxs(txs: TxDao[]) {
    const txsToPurge: TxDao[] = [];
    const pendingDeposits: {
      publicOwner: EthAddress;
      publicAssetId: number;
      contractValue: bigint;
      accumulatedDeposit: bigint;
    }[] = [];
    const discardedCommitments: { [key: string]: number } = {};
    const spentNoteNullifier = toBufferBE(1n, 32);

    for (const tx of txs) {
      const proof = new ProofData(tx.proofData);

      const discardTx = () => {
        discardedCommitments[proof.noteCommitment1.toString('hex')] = 1;
        discardedCommitments[proof.noteCommitment2.toString('hex')] = 1;
        txsToPurge.push(tx);
      };

      // first check to see if this tx chains from a tx that we have already discarded
      // if it does then we need to discard this tx too
      const backwardLink = proof.backwardLink.toString('hex');
      if (discardedCommitments[backwardLink]) {
        discardTx();
        continue;
      }

      // now we test the txs nullifiers to see if they are already in the nullifier tree
      // if they are then it means the txs note/s have already been spent by another tx
      const nullifierIndices = [proof.nullifier1, proof.nullifier2].map(n => toBigIntBE(n)).filter(n => n != 0n);
      let spentNotes = false;
      for (const nullifierIndex of nullifierIndices) {
        const value = await this.worldStateDb.get(RollupTreeId.NULL, nullifierIndex);
        if (value.equals(spentNoteNullifier)) {
          spentNotes = true;
          break;
        }
      }

      if (spentNotes) {
        discardTx();
        continue;
      }

      // now finally we need to check to check any DEPOSIT txs to ensure they aren't attempting to
      // deposit more funds than have been sent to the smart contract
      // this is done on an owner/asset combination basis
      if (proof.proofId != ProofId.DEPOSIT) {
        continue;
      }

      // extract the owner and asset
      const joinSplitProof = new JoinSplitProofData(proof);
      let index = pendingDeposits.findIndex(
        d => d.publicOwner.equals(joinSplitProof.publicOwner) && d.publicAssetId === joinSplitProof.publicAssetId,
      );
      // if we haven't seen this owner and asset before, query the contract for the pending deposit
      // and store the contract's deposit value
      if (index < 0) {
        const pendingDeposit = await this.blockchain.getUserPendingDeposit(
          joinSplitProof.publicAssetId,
          joinSplitProof.publicOwner,
        );
        pendingDeposits.push({
          publicOwner: joinSplitProof.publicOwner,
          publicAssetId: joinSplitProof.publicAssetId,
          contractValue: pendingDeposit,
          accumulatedDeposit: 0n,
        });
        index = pendingDeposits.length - 1;
      }
      // if the current accumulated value plus the new value exceed the contract value then reject the tx
      // other we accept the tx but accumulate it's public value
      const newTotalDeposit = pendingDeposits[index].accumulatedDeposit + joinSplitProof.publicValue;
      if (newTotalDeposit > pendingDeposits[index].contractValue) {
        discardTx();
      } else {
        pendingDeposits[index].accumulatedDeposit += joinSplitProof.publicValue;
      }
    }
    return txsToPurge.map(tx => tx.id);
  }

  private async processDefiProofs(rollup: RollupProofData, offchainTxData: Buffer[], block: Block) {
    const { innerProofData, dataStartIndex, bridgeCallDatas, rollupId } = rollup;
    const { interactionResult } = block;
    const claimsToAdd: ClaimDao[] = [];
    const confirmClaimedNullifiers: Buffer[] = [];

    let offChainIndex = 0;
    for (let i = 0; i < innerProofData.length; ++i) {
      const proofData = innerProofData[i];
      if (proofData.isPadding()) {
        continue;
      }
      switch (proofData.proofId) {
        case ProofId.DEFI_DEPOSIT: {
          const { bridgeCallData, depositValue, partialState, partialStateSecretEphPubKey, txFee } =
            OffchainDefiDepositData.fromBuffer(offchainTxData[offChainIndex]);
          const fee = txFee - (txFee >> BigInt(1));
          const index = dataStartIndex + i * 2;
          const interactionNonce =
            bridgeCallDatas.findIndex(bridge => bridge.equals(bridgeCallData.toBuffer())) +
            rollup.rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;
          const inputNullifier = proofData.nullifier1;
          const note = new TreeClaimNote(
            depositValue,
            bridgeCallData,
            interactionNonce,
            fee,
            partialState,
            inputNullifier,
          );
          const nullifier = this.noteAlgo.claimNoteNullifier(this.noteAlgo.claimNoteCommitment(note));
          const claim = new ClaimDao({
            id: index,
            nullifier,
            bridgeId: bridgeCallData.toBigInt(), // TODO: rename bridgeId to bridgeCallData
            depositValue,
            partialState,
            partialStateSecretEphPubKey: partialStateSecretEphPubKey.toBuffer(),
            inputNullifier,
            interactionNonce,
            fee,
            created: new Date(),
          });
          claimsToAdd.push(claim);
          break;
        }
        case ProofId.DEFI_CLAIM:
          confirmClaimedNullifiers.push(proofData.nullifier1);
          break;
      }
      offChainIndex++;
    }

    for (const defiNote of interactionResult) {
      this.log(
        `Received defi note result ${defiNote.result}, input ${defiNote.totalInputValue}, outputs ${defiNote.totalOutputValueA}/${defiNote.totalOutputValueB}, for nonce ${defiNote.nonce}`,
      );
    }

    // need to add the claims first as there may be claims added here that are updated further down
    await this.rollupDb.addClaims(claimsToAdd);

    await Promise.all([
      this.rollupDb.confirmClaimed(confirmClaimedNullifiers, block.mined),
      this.rollupDb.updateClaimsWithResultRollupId(
        interactionResult.map(ir => ir.nonce),
        rollupId,
      ),
    ]);
  }

  private async confirmOrAddRollupToDb(rollup: RollupProofData, offchainTxData: Buffer[], block: Block) {
    const { txHash, encodedRollupProofData, mined: created, interactionResult } = block;

    const assetMetrics = await this.getAssetMetrics(rollup, interactionResult);

    // Get by rollup hash, as a competing rollup may have the same rollup number.
    const rollupProof = await this.rollupDb.getRollupProof(rollup.rollupHash, true);

    // Compute the subtree root. Used client side for constructing mutable part of the data tree.
    const subtreeDepth = Math.ceil(Math.log2(rollup.rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX));
    const subtreeRoot = await this.worldStateDb.getSubtreeRoot(
      RollupTreeId.DATA,
      BigInt(rollup.dataStartIndex),
      subtreeDepth,
    );

    this.log(`Rollup num txs: ${rollup.getNonPaddingProofs().length}`);
    this.log(`Rollup subtree root: ${subtreeRoot.toString('hex')}`);
    this.log(`Rollup gas used: ${block.gasUsed}`);
    this.log(`Rollup gas price: ${fromBaseUnits(block.gasPrice, 9, 2)} gwei`);
    this.log(`Rollup cost: ${fromBaseUnits(block.gasPrice * BigInt(block.gasUsed), 18, 6)} ETH`);

    if (rollupProof) {
      // Our rollup. Confirm mined and track settlement times.
      this.log(`Confirmed mining of our rollup ${rollup.rollupId}`);
      const bridgeMetrics = await this.getBridgeMetrics(rollupProof, rollup.rollupId);
      const txIds = rollupProof.txs.map(tx => tx.id);
      const rollupDao = await this.rollupDb.confirmMined(
        rollup.rollupId,
        block.gasUsed,
        block.gasPrice,
        block.mined,
        block.txHash,
        interactionResult,
        txIds,
        assetMetrics,
        bridgeMetrics,
        subtreeRoot,
      );

      for (const inner of rollup.getNonPaddingProofs()) {
        const tx = rollupProof.txs.find(tx => tx.id.equals(inner.txId));
        if (!tx) {
          this.log('Rollup tx missing. Not tracking time...');
          continue;
        }
        this.metrics.txSettlementDuration(block.mined.getTime() - tx.created.getTime());
      }

      await this.metrics.rollupReceived(rollupDao);
    } else {
      this.log(`Adding rollup ${rollup.rollupId} from someone else`);
      // Not a rollup we created. Add or replace rollup.
      const txs: TxDao[] = [];

      // offChainData is present only for non-padding proofs so we have to track the index separately
      let offChainDataIndex = 0;
      for (const [i, proof] of rollup.innerProofData.entries()) {
        if (!proof.isPadding()) {
          txs.push(
            innerProofDataToTxDao(
              proof,
              offchainTxData[offChainDataIndex],
              created,
              getTxTypeFromInnerProofData(proof),
              i,
            ),
          );
          offChainDataIndex++;
        }
      }

      const rollupProofDao = new RollupProofDao({
        id: rollup.rollupHash,
        txs,
        rollupSize: rollup.rollupSize,
        dataStartIndex: rollup.dataStartIndex,
        encodedProofData: encodedRollupProofData,
        created: created,
      });

      const bridgeMetrics = await this.getBridgeMetrics(rollupProofDao, rollup.rollupId);

      const rollupDao = new RollupDao({
        id: rollup.rollupId,
        dataRoot: rollup.newDataRoot,
        rollupProof: rollupProofDao,
        ethTxHash: txHash,
        mined: block.mined,
        interactionResult: serializeBufferArrayToVector(interactionResult.map(r => r.toBuffer())),
        gasPrice: toBufferBE(block.gasPrice, 32),
        gasUsed: block.gasUsed,
        assetMetrics,
        bridgeMetrics,
        subtreeRoot,
      });

      await this.rollupDb.addRollup(rollupDao);
      await this.metrics.rollupReceived(rollupDao);
    }
  }

  private async getAssetMetrics(rollup: RollupProofData, interactionResults: DefiInteractionNote[]) {
    const result: AssetMetricsDao[] = [];
    const assetIds = new Set<number>();
    const { assets = [] } = this.blockchain.getBlockchainStatus();

    const isValidId = (id: number) => id < assets.length;

    // add rollup assetIds
    rollup.assetIds.filter(isValidId).forEach(assetId => assetIds.add(assetId));

    // add defi interaction assets to assetIds
    interactionResults.forEach(({ bridgeCallData }) => {
      bridgeCallData.inputAssetIdA < assets.length && assetIds.add(bridgeCallData.inputAssetIdA);
      bridgeCallData.outputAssetIdA < assets.length && assetIds.add(bridgeCallData.outputAssetIdA);

      bridgeCallData.inputAssetIdB !== undefined &&
        isValidId(bridgeCallData.inputAssetIdB) &&
        assetIds.add(bridgeCallData.inputAssetIdB);
      bridgeCallData.outputAssetIdB !== undefined &&
        isValidId(bridgeCallData.outputAssetIdB) &&
        assetIds.add(bridgeCallData.outputAssetIdB);
    });

    for (const assetId of assetIds) {
      const previous = await this.rollupDb.getAssetMetrics(assetId);
      const assetMetrics = previous ? previous : new AssetMetricsDao();
      assetMetrics.rollup = new RollupDao();
      assetMetrics.rollup.id = rollup.rollupId;
      assetMetrics.rollupId = rollup.rollupId;
      assetMetrics.assetId = assetId;
      assetMetrics.contractBalance = await this.blockchain.getRollupBalance(assetId);
      assetMetrics.totalDeposited += rollup.getTotalDeposited(assetId);
      assetMetrics.totalWithdrawn += rollup.getTotalWithdrawn(assetId);
      assetMetrics.totalDefiDeposited += rollup.getTotalDefiDeposit(assetId);
      assetMetrics.totalDefiClaimed += interactionResults.reduce(
        (a, v) =>
          a +
          (v.bridgeCallData.outputAssetIdA == assetId ? v.totalOutputValueA : BigInt(0)) +
          (v.bridgeCallData.outputAssetIdB == assetId ? v.totalOutputValueB : BigInt(0)),
        BigInt(0),
      );
      assetMetrics.totalFees += rollup.getTotalFees(assetId);
      result.push(assetMetrics);
    }
    return result;
  }

  private async getBridgeMetrics(rollupProof: RollupProofDao, rollupId: number) {
    const result: BridgeMetricsDao[] = [];
    const bridgeTxNum = new Map<bigint, number>();
    // count transactions for bridge
    for (const tx of rollupProof.txs.filter(({ txType }) => txType === TxType.DEFI_DEPOSIT)) {
      const { bridgeCallData } = OffchainDefiDepositData.fromBuffer(tx.offchainTxData);
      const num = bridgeTxNum.get(bridgeCallData.toBigInt()) || 0;
      bridgeTxNum.set(bridgeCallData.toBigInt(), num + 1);
    }

    // register metrics for defi bridge usage
    for (const [bridgeCallData, numTxs] of bridgeTxNum.entries()) {
      const storedMetrics = await this.rollupDb.getBridgeMetricsForRollup(bridgeCallData, rollupId);
      const bridgeMetrics = storedMetrics
        ? storedMetrics
        : new BridgeMetricsDao({
            rollupId,
            bridgeId: bridgeCallData, // TODO: rename bridgeId to bridgeCallData
            publishedByProvider: false,
          });
      bridgeMetrics.numTxs = numTxs;
      bridgeMetrics.totalNumTxs = (bridgeMetrics.totalNumTxs || 0) + numTxs;
      result.push(bridgeMetrics);
    }

    return result;
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
    const { rollupId, dataStartIndex, innerProofData, defiInteractionNotes } = rollup;

    const currentSize = this.worldStateDb.getSize(0);
    if (currentSize > dataStartIndex) {
      // The tree data is immutable, so we can assume if it's larger than the current start index, that this
      // data has been inserted before. e.g. maybe just the sql db was erased, but we still have the tree data.
      this.log(`Data tree size of ${currentSize} is > ${dataStartIndex}, skipping updates.`);
      return;
    }

    for (let i = 0; i < innerProofData.length; ++i) {
      const tx = innerProofData[i];
      await this.worldStateDb.put(RollupTreeId.DATA, BigInt(dataStartIndex + i * 2), tx.noteCommitment1);
      await this.worldStateDb.put(RollupTreeId.DATA, BigInt(dataStartIndex + i * 2 + 1), tx.noteCommitment2);
      if (!tx.isPadding()) {
        const nullifier1 = toBigIntBE(tx.nullifier1);
        if (nullifier1) {
          await this.worldStateDb.put(RollupTreeId.NULL, nullifier1, toBufferBE(1n, 32));
        }
        const nullifier2 = toBigIntBE(tx.nullifier2);
        if (nullifier2) {
          await this.worldStateDb.put(RollupTreeId.NULL, nullifier2, toBufferBE(1n, 32));
        }
      }
    }

    await this.worldStateDb.put(RollupTreeId.ROOT, BigInt(rollupId + 1), this.worldStateDb.getRoot(0));

    const interactionNoteStartIndex = rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;
    for (let i = 0; i < defiInteractionNotes.length; ++i) {
      const index = BigInt(interactionNoteStartIndex + i);
      if (defiInteractionNotes[i].equals(Buffer.alloc(0, 32))) {
        continue;
      }
      await this.worldStateDb.put(RollupTreeId.DEFI, index, defiInteractionNotes[i]);
    }

    await this.worldStateDb.commit();
  }

  /**
   * getPendingTxs from rollup db
   * remove the tranasctions that we know are in the next rollup currently being built
   */
  private async computeTxPoolProfile() {
    const pendingTxs = await this.rollupDb.getPendingTxs();
    const processedTransactions = this.pipeline?.getProcessedTxs() || [];

    const txsBeingProcessed = new Set(processedTransactions.map(tx => tx.id.toString('hex')));

    const pendingTransactionsNotBeingProcessed = pendingTxs.filter(
      elem => !txsBeingProcessed.has(elem.id.toString('hex')),
    );

    const pendingBridgeStats: Map<bigint, BridgeStat> = new Map();
    for (const tx of pendingTransactionsNotBeingProcessed) {
      const proof = new ProofData(tx.proofData);
      if (proof.proofId !== ProofId.DEFI_DEPOSIT) {
        continue;
      }

      const defiProof = new DefiDepositProofData(proof);
      const rollupTx = createDefiRollupTx(tx, defiProof);
      const bridgeCallData = rollupTx.bridgeCallData!;
      const bridgeProfile = pendingBridgeStats.get(bridgeCallData) || {
        bridgeCallData,
        gasAccrued: 0,
      };
      bridgeProfile.gasAccrued += this.txFeeResolver.getSingleBridgeTxGas(bridgeCallData) + rollupTx.excessGas;

      pendingBridgeStats.set(bridgeCallData, bridgeProfile);
    }

    setTimeout(() => {
      this.txPoolProfile = undefined;
    }, this.expireTxPoolAfter);

    const result: TxPoolProfile = {
      numTxs: await this.rollupDb.getUnsettledTxCount(),
      numTxsInNextRollup: processedTransactions.length,
      pendingBridgeStats: [...pendingBridgeStats.values()],
      pendingTxCount: pendingTransactionsNotBeingProcessed.length,
      pendingSecondClassTxCount: await this.rollupDb.getPendingSecondClassTxCount(),
    };

    return result;
  }
}

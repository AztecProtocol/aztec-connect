import { EthAddress } from '@aztec/barretenberg/address';
import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { DefiDepositProofData, JoinSplitProofData, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { DefiInteractionNote, NoteAlgorithms, TreeClaimNote } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiDepositData } from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { Timer } from '@aztec/barretenberg/timer';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { AccountDao, AssetMetricsDao, ClaimDao, RollupDao, RollupProofDao, TxDao } from './entity';
import { getTxTypeFromInnerProofData } from './get_tx_type';
import { Metrics } from './metrics';
import { createDefiRollupTx } from './pipeline_coordinator/bridge_tx_queue';
import { RollupTimeout, RollupTimeouts } from './pipeline_coordinator/publish_time_manager';
import { parseInteractionResult, RollupDb } from './rollup_db';
import { RollupPipeline, RollupPipelineFactory } from './rollup_pipeline';
import { TxFeeResolver } from './tx_fee_resolver';

const innerProofDataToTxDao = (tx: InnerProofData, offchainTxData: Buffer, created: Date, txType: TxType) => {
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
  return txDao;
};

const rollupDaoToBlockBuffer = (dao: RollupDao) => {
  return new Block(
    dao.ethTxHash!,
    dao.created,
    dao.id,
    dao.rollupProof.rollupSize,
    dao.rollupProof.proofData!,
    dao.rollupProof.txs.map(tx => tx.offchainTxData),
    parseInteractionResult(dao.interactionResult!),
    dao.gasUsed!,
    toBigIntBE(dao.gasPrice!),
    dao.subtreeRoot,
  ).toBuffer();
};

interface BridgeStat {
  bridgeId: bigint;
  gasAccrued: number;
}

type TxPoolProfile = {
  numTxsInNextRollup: number;
  numTxs: number;
  pendingBridgeStats: BridgeStat[];
  pendingTxCount: number;
};

export class WorldState {
  private blockQueue = new MemoryFifo<Block>();
  private pipeline?: RollupPipeline;
  private blockBufferCache: Buffer[] = [];
  private txPoolProfile!: TxPoolProfile;
  private txPoolProfileValidUntil!: Date;

  constructor(
    public rollupDb: RollupDb,
    public worldStateDb: WorldStateDb,
    private blockchain: Blockchain,
    private pipelineFactory: RollupPipelineFactory,
    private noteAlgo: NoteAlgorithms,
    private metrics: Metrics,
    private txFeeResolver: TxFeeResolver,
    private expireTxPoolAfter = 60,
  ) {
    this.txPoolProfile = {
      numTxs: 0,
      numTxsInNextRollup: 0,
      pendingTxCount: 0,
      pendingBridgeStats: [],
    };
  }

  public async start() {
    await this.worldStateDb.start();

    await this.syncState();

    // Get all settled rollups, and convert them to block buffers for shipping to clients.
    // New blocks will be appended as they are received.
    this.blockBufferCache = (await this.rollupDb.getSettledRollups(0)).map(rollupDaoToBlockBuffer);

    this.blockchain.on('block', block => this.blockQueue.put(block));
    await this.blockchain.start(await this.rollupDb.getNextRollupId());

    this.blockQueue.process(block => this.handleBlock(block));

    await this.startNewPipeline();
  }

  public setTxFeeResolver(txFeeResolver: TxFeeResolver) {
    this.txFeeResolver = txFeeResolver;
  }

  public getRollupSize() {
    return this.pipelineFactory.getRollupSize();
  }

  public getBlockBuffers(from: number) {
    return this.blockBufferCache.slice(from);
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

  public async getTxPoolProfile() {
    // getPendingTxs from rollup db
    // remove the tranasctions that we know are in the next rollup currently being built
    if (!this.txPoolProfileValidUntil || new Date().getTime() > this.txPoolProfileValidUntil.getTime()) {
      const pendingTxs = await this.rollupDb.getPendingTxs();
      const processedTransactions = this.pipeline?.getProcessedTxs() || [];
      const pendingTransactionsNotInRollup = pendingTxs.filter(elem =>
        processedTransactions.every(tx => !tx.id.equals(elem.id)),
      );

      const pendingBridgeStats: Map<bigint, BridgeStat> = new Map();
      for (const tx of pendingTransactionsNotInRollup) {
        const proof = new ProofData(tx.proofData);
        if (proof.proofId !== ProofId.DEFI_DEPOSIT) {
          continue;
        }

        const defiProof = new DefiDepositProofData(proof);
        const rollupTx = createDefiRollupTx(tx, defiProof);
        const bridgeId = rollupTx.bridgeId!;
        const bridgeProfile = pendingBridgeStats.get(bridgeId) || {
          bridgeId,
          gasAccrued: 0,
        };
        bridgeProfile.gasAccrued += this.txFeeResolver.getSingleBridgeTxGas(bridgeId) + rollupTx.excessGas;

        pendingBridgeStats.set(bridgeId, bridgeProfile);
      }

      this.txPoolProfile = {
        numTxs: await this.rollupDb.getUnsettledTxCount(),
        numTxsInNextRollup: processedTransactions.length,
        pendingBridgeStats: [...pendingBridgeStats.values()],
        pendingTxCount: pendingTransactionsNotInRollup.length,
      };

      this.txPoolProfileValidUntil = new Date(Date.now() + this.expireTxPoolAfter);
    }

    return this.txPoolProfile;
  }

  public async stop() {
    this.blockQueue.cancel();
    this.blockchain.stop();
    await this.pipeline?.stop();
    this.worldStateDb.stop();
  }

  public flushTxs() {
    this.pipeline?.flushTxs();
  }

  private async syncStateFromInitFiles() {
    console.log('Synching state from initialisation files...');
    const chainId = await this.blockchain.getChainId();
    console.log(`Chain id: ${chainId}`);
    const accountDataFile = InitHelpers.getAccountDataFile(chainId);
    if (!accountDataFile) {
      console.log(`No account initialisation file for chain ${chainId}.`);
      return;
    }
    const accounts = await InitHelpers.readAccountTreeData(accountDataFile);
    const {
      dataRoot: initDataRoot,
      nullRoot: initNullRoot,
      rootsRoot: initRootsRoot,
    } = InitHelpers.getInitRoots(chainId);
    if (accounts.length === 0) {
      console.log('No accounts read from file, continuing without syncing from file.');
      return;
    }
    if (!initDataRoot.length || !initNullRoot.length || !initRootsRoot.length) {
      console.log('No roots read from file, continuing without syncing from file.');
      return;
    }
    console.log(`Read ${accounts.length} accounts from file.`);
    const numNotesPerRollup = WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX * this.getRollupSize();
    const { dataRoot, rootsRoot } = await InitHelpers.populateDataAndRootsTrees(
      accounts,
      this.worldStateDb,
      RollupTreeId.DATA,
      RollupTreeId.ROOT,
      numNotesPerRollup,
    );
    const newNullRoot = await InitHelpers.populateNullifierTree(accounts, this.worldStateDb, RollupTreeId.NULL);

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

    const accountDaos = accounts.map(
      a =>
        new AccountDao({
          accountPublicKey: a.alias.address,
          aliasHash: a.alias.aliasHash,
        }),
    );
    await this.rollupDb.addAccounts(accountDaos);
  }

  private async syncStateFromBlockchain(nextRollupId: number) {
    console.log(`Syncing state from rollup ${nextRollupId}...`);
    const blocks = await this.blockchain.getBlocks(nextRollupId);

    for (const block of blocks) {
      await this.updateDbs(block);
    }
  }

  /**
   * Called at startup to bring us back in sync.
   * Erases any orphaned rollup proofs and unsettled rollups from rollup db.
   * Processes all rollup blocks from the last settled rollup in the rollup db.
   */
  private async syncState() {
    this.printState();
    const nextRollupId = await this.rollupDb.getNextRollupId();
    console.log(`Syncing state, next rollup id: ${nextRollupId}`);
    const updateDbsStart = new Timer();
    if (nextRollupId === 0) {
      await this.syncStateFromInitFiles();
    }
    await this.syncStateFromBlockchain(nextRollupId);

    // This deletes all proofs created until now. Not ideal, figure out a way to resume.
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();

    console.log(`Database synched in ${updateDbsStart.s()}s.`);
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
    await this.pipeline?.stop();
    await this.worldStateDb.rollback();
    await this.rollupDb.deleteUnsettledRollups();
    await this.rollupDb.deleteOrphanedRollupProofs();
    await this.rollupDb.deletePendingTxs();
    await this.startNewPipeline();
  }

  private async startNewPipeline() {
    this.pipeline = await this.pipelineFactory.create();
    this.pipeline.start().catch(async err => {
      await this.pipeline?.stop();
      this.pipeline = undefined;
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
    await this.pipeline?.stop();
    await this.updateDbs(block);
    await this.startNewPipeline();
  }

  /**
   * Inserts the rollup in the given block into the merkle tree and sql db.
   */
  private async updateDbs(block: Block) {
    const end = this.metrics.processBlockTimer();
    const { rollupProofData: rawRollupData, offchainTxData } = block;
    const rollupProofData = RollupProofData.fromBuffer(rawRollupData);
    const { rollupId, rollupHash, newDataRoot, newNullRoot, newDataRootsRoot, newDefiRoot } = rollupProofData;

    console.log(`Processing rollup ${rollupId}: ${rollupHash.toString('hex')}...`);

    if (
      newDataRoot.equals(this.worldStateDb.getRoot(RollupTreeId.DATA)) &&
      newNullRoot.equals(this.worldStateDb.getRoot(RollupTreeId.NULL)) &&
      newDataRootsRoot.equals(this.worldStateDb.getRoot(RollupTreeId.ROOT)) &&
      newDefiRoot.equals(this.worldStateDb.getRoot(RollupTreeId.DEFI))
    ) {
      // This must be the rollup we just published. Commit the world state.
      await this.worldStateDb.commit();
    } else {
      // Someone elses rollup. Discard any of our world state modifications and update world state with new rollup.
      await this.worldStateDb.rollback();
      await this.addRollupToWorldState(rollupProofData);
    }

    await this.processDefiProofs(rollupProofData, offchainTxData, block);

    await this.confirmOrAddRollupToDb(rollupProofData, offchainTxData, block);

    await this.purgeInvalidTxs();

    this.printState();
    end();
  }

  private async purgeInvalidTxs() {
    const pendingTxs = await this.rollupDb.getPendingTxs();
    const txsToPurge = await this.validateTxs(pendingTxs);
    if (!txsToPurge.length) {
      return;
    }
    await this.rollupDb.deleteTxsById(txsToPurge);
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
    const { innerProofData, dataStartIndex, bridgeIds, rollupId } = rollup;
    const { interactionResult } = block;
    let offChainIndex = 0;
    for (let i = 0; i < innerProofData.length; ++i) {
      const proofData = innerProofData[i];
      if (proofData.isPadding()) {
        continue;
      }
      switch (proofData.proofId) {
        case ProofId.DEFI_DEPOSIT: {
          const { bridgeId, depositValue, partialState, partialStateSecretEphPubKey, txFee } =
            OffchainDefiDepositData.fromBuffer(offchainTxData[offChainIndex]);
          const fee = txFee - (txFee >> BigInt(1));
          const index = dataStartIndex + i * 2;
          const interactionNonce =
            bridgeIds.findIndex(bridge => bridge.equals(bridgeId.toBuffer())) +
            rollup.rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;
          const inputNullifier = proofData.nullifier1;
          const note = new TreeClaimNote(depositValue, bridgeId, interactionNonce, fee, partialState, inputNullifier);
          const nullifier = this.noteAlgo.claimNoteNullifier(this.noteAlgo.claimNoteCommitment(note));
          const claim = new ClaimDao({
            id: index,
            nullifier,
            bridgeId: bridgeId.toBigInt(),
            depositValue,
            partialState,
            partialStateSecretEphPubKey: partialStateSecretEphPubKey.toBuffer(),
            inputNullifier,
            interactionNonce,
            fee,
            created: new Date(),
          });
          await this.rollupDb.addClaim(claim);
          break;
        }
        case ProofId.DEFI_CLAIM:
          await this.rollupDb.confirmClaimed(proofData.nullifier1, block.created);
          break;
      }
      offChainIndex++;
    }

    for (const defiNote of interactionResult) {
      console.log(
        `Received defi note result ${defiNote.result}, input ${defiNote.totalInputValue}, outputs ${defiNote.totalOutputValueA}/${defiNote.totalOutputValueB}, for nonce ${defiNote.nonce}`,
      );
      await this.rollupDb.updateClaimsWithResultRollupId(defiNote.nonce, rollupId);
    }
  }

  private async confirmOrAddRollupToDb(rollup: RollupProofData, offchainTxData: Buffer[], block: Block) {
    const { txHash, rollupProofData: proofData, created } = block;

    const assetMetrics = await this.getAssetMetrics(rollup, block.interactionResult);

    // Get by rollup hash, as a competing rollup may have the same rollup number.
    const rollupProof = await this.rollupDb.getRollupProof(rollup.rollupHash, true);

    // 2 notes per tx
    const subtreeDepth = Math.ceil(Math.log2(rollup.rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX));
    const lastIndex = this.worldStateDb.getSize(RollupTreeId.DATA) - 1n;
    const subtreeRoot = await this.worldStateDb.getSubtreeRoot(RollupTreeId.DATA, lastIndex, subtreeDepth);
    if (rollupProof) {
      // Our rollup. Confirm mined and track settlement times.
      const txIds = rollupProof.txs.map(tx => tx.id);
      const rollupDao = await this.rollupDb.confirmMined(
        rollup.rollupId,
        block.gasUsed,
        block.gasPrice,
        block.created,
        block.txHash,
        block.interactionResult,
        txIds,
        assetMetrics,
        subtreeRoot,
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

      this.metrics.rollupReceived(rollupDao!);
    } else {
      // Not a rollup we created. Add or replace rollup.
      const txs = rollup.innerProofData
        .filter(tx => !tx.isPadding())
        .map((p, i) => innerProofDataToTxDao(p, offchainTxData[i], created, getTxTypeFromInnerProofData(p)));
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
        interactionResult: Buffer.concat(block.interactionResult.map(r => r.toBuffer())),
        gasPrice: toBufferBE(block.gasPrice, 32),
        gasUsed: block.gasUsed,
        assetMetrics,
        subtreeRoot,
      });

      await this.rollupDb.addRollup(rollupDao);
      this.metrics.rollupReceived(rollupDao!);
    }

    const rollupDao = (await this.rollupDb.getRollup(rollup.rollupId))!;
    this.blockBufferCache.push(rollupDaoToBlockBuffer(rollupDao!));
  }

  private async getAssetMetrics(rollup: RollupProofData, interactionResults: DefiInteractionNote[]) {
    const result: AssetMetricsDao[] = [];
    for (const assetId of rollup.assetIds.filter(id => id != 1 << 30)) {
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
          (v.bridgeId.outputAssetIdA == assetId ? v.totalOutputValueA : BigInt(0)) +
          (v.bridgeId.outputAssetIdB == assetId ? v.totalOutputValueB : BigInt(0)),
        BigInt(0),
      );
      assetMetrics.totalFees += rollup.getTotalFees(assetId);
      result.push(assetMetrics);
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
}

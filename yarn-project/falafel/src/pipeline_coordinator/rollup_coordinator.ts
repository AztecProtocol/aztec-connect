import { isAccountTx, isDefiDepositTx, TxType, numTxTypes } from '@aztec/barretenberg/blockchain';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { asyncMap } from '@aztec/barretenberg/async_map';
import { BridgeResolver } from '../bridge/index.js';
import { TxDao } from '../entity/index.js';
import { RollupAggregator } from '../rollup_aggregator.js';
import { RollupCreator } from '../rollup_creator.js';
import { RollupDb } from '../rollup_db/index.js';
import { RollupPublisher } from '../rollup_publisher.js';
import { TxFeeResolver } from '../tx_fee_resolver/index.js';
import { Metrics } from '../metrics/index.js';
import { BridgeTxQueue, createDefiRollupTx, createRollupTx, RollupTx, RollupResources } from './bridge_tx_queue.js';
import { PublishTimeManager, RollupTimeouts } from './publish_time_manager.js';
import { profileRollup, RollupProfile } from './rollup_profiler.js';
import { RollupDao } from '../entity/index.js';
import { InterruptError } from '@aztec/barretenberg/errors';
import { BridgeSubsidyProvider } from '../bridge/bridge_subsidy_provider.js';

enum RollupCoordinatorState {
  BUILDING,
  PUBLISHING,
  INTERRUPTED,
}

export class RollupCoordinator {
  private processedTxs: RollupTx[] = [];
  private totalSlots: number;
  private state = RollupCoordinatorState.BUILDING;
  private interrupted = false;

  constructor(
    private publishTimeManager: PublishTimeManager,
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private rollupDb: RollupDb,
    private numInnerRollupTxs: number,
    _: number,
    private oldDefiRoot: Buffer,
    private oldDefiPath: HashPath,
    private bridgeResolver: BridgeResolver,
    private feeResolver: TxFeeResolver,
    private defiInteractionNotes: DefiInteractionNote[] = [],
    private maxGasForRollup: number,
    private maxCallDataForRollup: number,
    private metrics: Metrics,
    private log = console.log,
  ) {
    // Ejector only has 5 slots.
    this.totalSlots = 5; //this.numOuterRollupProofs * this.numInnerRollupTxs;
  }

  public getProcessedTxs() {
    return this.processedTxs.map(rollupTx => rollupTx.tx);
  }

  public async interrupt(shouldThrowIfFailToStop: boolean) {
    if (shouldThrowIfFailToStop) {
      // if we are not in the BUILDING state then interrupts can't take place
      // notify of this if we have been asked to do so
      if (this.state != RollupCoordinatorState.BUILDING) {
        throw new Error(`Rollup already ${RollupCoordinatorState[this.state].toLowerCase()}`);
      }
    }

    this.interrupted = true;
    await this.rollupCreator.interrupt();
    await this.rollupAggregator.interrupt();
    this.processedTxs = [];
  }

  public async processPendingTxs(pendingTxs: TxDao[], flush = false): Promise<RollupProfile> {
    const rollupTimeouts = this.publishTimeManager.calculateLastTimeouts();
    const bridgeSubsidyProvider = new BridgeSubsidyProvider(this.bridgeResolver);
    const bridgeQueues = new Map<bigint, BridgeTxQueue>();

    const { txs, resourceConsumption } = await this.getNextTxsToRollup(
      pendingTxs,
      flush,
      bridgeSubsidyProvider,
      bridgeQueues,
    );

    this.checkpoint();
    return await this.aggregateAndPublish(
      txs,
      resourceConsumption,
      rollupTimeouts,
      flush,
      bridgeSubsidyProvider,
      bridgeQueues,
    );
  }

  private async getNextTxsToRollup(
    pendingTxs: TxDao[],
    flush: boolean,
    bridgeSubsidyProvider: BridgeSubsidyProvider,
    bridgeQueues: Map<bigint, BridgeTxQueue>,
  ) {
    // Gas should be thought of as "layer 2 gas". It's a universal unit of cost for producing a rollup.
    // The initial gasUsed, in an empty rollup, is the cost of verification.
    // Hence total slots * verification gas per slot.
    const resourceConsumption: RollupResources = {
      gasUsed: this.totalSlots * this.feeResolver.getUnadjustedBaseVerificationGas(),
      callDataUsed: 0,
      bridgeCallDatas: [],
      assetIds: new Set<number>(),
    };

    // We want to ensure that any claim proofs are prioritised. Sort them to the front.
    const sortedTxs = [...pendingTxs].sort((a, b) =>
      a.txType === TxType.DEFI_CLAIM && a.txType !== b.txType ? -1 : 1,
    );

    let txs: RollupTx[] = [];

    // Reasons to discard txs:
    // The fee on the transaction is an asset not already in the set of rollup assets, and the set is full.
    // It's chained to a transaction that's been discarded.
    // It's a defi deposit who's bridge is not yet profitable.
    const discardedCommitments: Buffer[] = [];
    for (let i = 0; i < sortedTxs.length && txs.length < this.totalSlots; ++i) {
      const tx = sortedTxs[i];
      const proofData = new ProofData(tx.proofData);
      const assetId = proofData.feeAssetId;

      // Account txs don't have fees and are not part of chains
      // so only need to be checked against gas and call data limits
      // Do that here and then move on
      if (isAccountTx(tx.txType)) {
        // calling this with TxType.ACCOUNT will mean the given assetId is not used
        // as accounts txs have no dependency on asset
        // so we can simply pass ETH
        if (this.validateAndUpdateRollupResources(TxType.ACCOUNT, 0, resourceConsumption)) {
          // the tx can be included in the rollup
          txs.push(createRollupTx(tx, proofData));
        }
        continue;
      }

      const discardTx = () => {
        discardedCommitments.push(proofData.noteCommitment1);
        discardedCommitments.push(proofData.noteCommitment2);
      };

      const addTx = () => {
        if (this.feeResolver.isFeePayingAsset(assetId)) {
          resourceConsumption.assetIds.add(assetId);
        }
        txs.push(createRollupTx(tx, proofData));
      };

      // Discard tx if its fee is payed in an asset that needs to be added to the asset set, and the set is full.
      if (
        this.feeResolver.isFeePayingAsset(assetId) &&
        !resourceConsumption.assetIds.has(assetId) &&
        resourceConsumption.assetIds.size === RollupProofData.NUMBER_OF_ASSETS
      ) {
        discardTx();
        continue;
      }

      // Discard tx if it's chaining off a discarded tx.
      if (
        !proofData.backwardLink.equals(Buffer.alloc(32)) &&
        discardedCommitments.some(c => c.equals(proofData.backwardLink))
      ) {
        discardTx();
        continue;
      }

      if (!isDefiDepositTx(tx.txType)) {
        // We discard if the addition would breach resources such as calldata.
        if (!this.validateAndUpdateRollupResources(tx.txType, assetId, resourceConsumption)) {
          discardTx();
          continue;
        }
        addTx();
      } else {
        // Returns a set of txs to be added to the rollup. e.g. all the defi txs for a bridge, once it's profitable.
        txs = await this.handleNewDefiTx(
          tx,
          this.totalSlots - txs.length,
          flush,
          resourceConsumption,
          txs,
          bridgeSubsidyProvider,
          bridgeQueues,
        );
      }
    }

    return {
      txs,
      resourceConsumption,
    };
  }

  // If txs are added in this function, then the provided resource consumption will be updated to include the resources
  // consumed by those txs.
  private async handleNewDefiTx(
    tx: TxDao,
    remainingTxSlots: number,
    flush: boolean,
    currentConsumption: RollupResources,
    txsForRollup: RollupTx[],
    bridgeSubsidyProvider: BridgeSubsidyProvider,
    bridgeQueues: Map<bigint, BridgeTxQueue>,
  ): Promise<RollupTx[]> {
    // We have a new defi interaction, we need to determine if it can be accepted and if so whether it gets queued or
    // goes straight on chain.
    const proof = new ProofData(tx.proofData);
    const defiProof = new DefiDepositProofData(proof);
    const rollupTx = createDefiRollupTx(tx, defiProof);
    const bridgeCallData = rollupTx.bridgeCallData!;
    const bridgeAlreadyPresentInRollup = currentConsumption.bridgeCallDatas.some(id => id === bridgeCallData);

    const addTxs = (txs: RollupTx[]) => {
      for (const tx of txs) {
        txsForRollup.push(tx);
        if (tx.fee.value && this.feeResolver.isFeePayingAsset(tx.fee.assetId)) {
          currentConsumption.assetIds.add(tx.fee.assetId);
        }
        if (!currentConsumption.bridgeCallDatas.some(id => id === bridgeCallData)) {
          currentConsumption.bridgeCallDatas.push(tx.bridgeCallData!);
        }
      }
    };

    const verifyResourceLimits = (txs: RollupTx[]) => {
      let totalGasUsedInRollup = currentConsumption.gasUsed;
      if (!bridgeAlreadyPresentInRollup) {
        // we need the full bridge gas from the contract as this is the value that does not include any subsidy
        totalGasUsedInRollup += this.feeResolver.getFullBridgeGasFromContract(bridgeCallData);
      }
      totalGasUsedInRollup += txs.reduce(
        (sum, current) =>
          sum +
          (this.feeResolver.getUnadjustedTxGas(current.fee.assetId, TxType.DEFI_DEPOSIT) -
            this.feeResolver.getUnadjustedBaseVerificationGas()),
        0,
      );
      const totalCallDataUsedInRollup =
        currentConsumption.callDataUsed + txs.length * this.feeResolver.getTxCallData(TxType.DEFI_DEPOSIT);
      const breach =
        totalGasUsedInRollup > this.maxGasForRollup || totalCallDataUsedInRollup > this.maxCallDataForRollup;
      return {
        breach,
        totalGasUsedInRollup,
        totalCallDataUsedInRollup,
      };
    };

    const checkAndAddTxs = (txs: RollupTx[]) => {
      const newConsumption = verifyResourceLimits(txs);
      if (!newConsumption.breach) {
        addTxs([rollupTx]);
        currentConsumption.callDataUsed = newConsumption.totalCallDataUsedInRollup;
        currentConsumption.gasUsed = newConsumption.totalGasUsedInRollup;
      }
    };

    if (bridgeAlreadyPresentInRollup) {
      // we already have txs for this bridge in the rollup, add it straight in
      checkAndAddTxs([rollupTx]);
      return txsForRollup;
    }

    if (currentConsumption.bridgeCallDatas.length === RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
      // this rollup doesn't have any txs for this bridge and can't take any more
      return txsForRollup;
    }

    if (flush) {
      // we have been told to flush, add it straight into the rollup
      checkAndAddTxs([rollupTx]);
      return txsForRollup;
    }

    let bridgeQueue = bridgeQueues.get(bridgeCallData);

    if (!bridgeQueue) {
      bridgeQueue = new BridgeTxQueue(bridgeCallData, this.feeResolver, bridgeSubsidyProvider);
      bridgeQueues.set(bridgeCallData, bridgeQueue);
    }

    // Add this tx to the queue for this bridge and work out if we can put any more txs into the current batch or create
    // a new one.
    bridgeQueue.addDefiTx(rollupTx);
    const gasRemainingInRollup = this.maxGasForRollup - currentConsumption.gasUsed;
    const callDataRemainingInRollup = this.maxCallDataForRollup - currentConsumption.callDataUsed;
    const bridgeQueueResult = await bridgeQueue.getTxsToRollup(
      remainingTxSlots,
      currentConsumption.assetIds,
      RollupProofData.NUMBER_OF_ASSETS,
      gasRemainingInRollup,
      callDataRemainingInRollup,
    );
    addTxs(bridgeQueueResult.txsToRollup);
    currentConsumption.callDataUsed += bridgeQueueResult.resourcesConsumed.callDataUsed;
    currentConsumption.gasUsed += bridgeQueueResult.resourcesConsumed.gasUsed;
    return txsForRollup;
  }

  // If the provided tx does not cause a breach of the limits, the provided consumption figures will be updated to
  // include the values from this tx.
  private validateAndUpdateRollupResources(
    txType: TxType,
    feeAssetId: number,
    currentConsumption: { gasUsed: number; callDataUsed: number },
  ) {
    // We need the the unadjusted tx gas here, this is the 'real' gas consumption of this tx.
    const gasUsedByTx =
      this.feeResolver.getUnadjustedTxGas(feeAssetId, txType) - this.feeResolver.getUnadjustedBaseVerificationGas();
    const callDataUsedByTx = this.feeResolver.getTxCallData(txType);
    const newGasUsed = gasUsedByTx + currentConsumption.gasUsed;
    const newCallDataUsed = callDataUsedByTx + currentConsumption.callDataUsed;
    if (newGasUsed > this.maxGasForRollup || newCallDataUsed > this.maxCallDataForRollup) {
      return false;
    }
    currentConsumption.callDataUsed = newCallDataUsed;
    currentConsumption.gasUsed = newGasUsed;
    return true;
  }

  private async aggregateAndPublish(
    txsToRollup: RollupTx[],
    resourceConsumption: RollupResources,
    rollupTimeouts: RollupTimeouts,
    flush: boolean,
    bridgeSubsidyProvider: BridgeSubsidyProvider,
    bridgeQueues: Map<bigint, BridgeTxQueue>,
  ) {
    if (txsToRollup.length > this.totalSlots) {
      // This shouldn't happen!
      throw new Error(`txsToRollup.length > numRemainingSlots: ${txsToRollup.length} > ${this.totalSlots}`);
    }

    let rollupProfile = profileRollup(
      txsToRollup,
      this.feeResolver,
      this.numInnerRollupTxs,
      this.totalSlots,
      bridgeSubsidyProvider,
    );

    if (!rollupProfile.totalTxs) {
      // No txs at all.
      return rollupProfile;
    }

    const conditions = this.getRollupPublishConditions(txsToRollup, rollupProfile, rollupTimeouts);
    const { deadline } = conditions;
    let { outOfGas, outOfCallData, outOfSlots } = conditions;

    const shouldPublish = flush;

    if (!shouldPublish) {
      try {
        await this.metrics.recordRollupMetrics(
          rollupProfile,
          this.bridgeResolver,
          Array.from(bridgeQueues.values()).map(bq => bq.getQueueStats()),
        );
      } catch (err) {
        this.log('Error recording rollup metrics: ', err.message);
      }
      return rollupProfile;
    }

    // Check if there is room for some second class transactions and add them to rollup
    const secondClassTxs: RollupTx[] = [];
    // Add second class txs only if block can still fit more txs
    // (if we got here because of flush, isProfitable or deadline)
    if (!(outOfGas || outOfCallData || outOfSlots)) {
      // Get enough second class txs to fill up all empty slots in rollup
      const allSecondClassTxs = await this.rollupDb.getPendingSecondClassTxs(this.totalSlots - txsToRollup.length);
      for (
        let i = 0;
        i < allSecondClassTxs.length && txsToRollup.length + secondClassTxs.length < this.totalSlots;
        i++
      ) {
        const tx = allSecondClassTxs[i];
        const proofData = new ProofData(tx.proofData);

        if (isAccountTx(tx.txType)) {
          // mutates resource consumption
          if (this.validateAndUpdateRollupResources(TxType.ACCOUNT, 0, resourceConsumption)) {
            secondClassTxs.push(createRollupTx(tx, proofData));
          }
        }
      }
    }

    // If second class txs have been added, reprofile the rollup before publishing conditions/metrics/state.
    if (secondClassTxs.length) {
      // Track txs currently being processed. Gives clients a view into what's being processed.
      this.processedTxs = txsToRollup.concat(secondClassTxs);

      // Reprofile now that second class txs are possibly included
      rollupProfile = profileRollup(
        this.processedTxs,
        this.feeResolver,
        this.numInnerRollupTxs,
        this.totalSlots,
        bridgeSubsidyProvider,
      );

      // outOf* conditions will change after inclusion of 2nd class txs
      ({ outOfGas, outOfCallData, outOfSlots } = this.getRollupPublishConditions(
        this.processedTxs,
        rollupProfile,
        rollupTimeouts,
      ));
    } else {
      // Track txs currently being processed. Gives clients a view into what's being processed.
      this.processedTxs = [...txsToRollup];
    }

    try {
      await this.metrics.recordRollupMetrics(
        rollupProfile,
        this.bridgeResolver,
        Array.from(bridgeQueues.values()).map(bq => bq.getQueueStats()),
      );
    } catch (err) {
      this.log('Error recording rollup metrics: ', err.message);
    }

    await this.printRollupState(rollupProfile, deadline, flush, outOfGas || outOfCallData || outOfSlots);

    // Chunk txs for each inner rollup.
    const chunkedTx: RollupTx[][] = [];
    const tmpTxs = [...this.processedTxs];
    while (tmpTxs.length) {
      chunkedTx.push(tmpTxs.splice(0, this.numInnerRollupTxs));
    }

    // First create circuit input data. In sequence as it updates the merkle trees.
    const txRollups = await asyncMap(
      chunkedTx,
      async (innerRollupTxs, i) =>
        await this.rollupCreator.createRollup(
          innerRollupTxs.map(rollupTx => rollupTx.tx),
          resourceConsumption.bridgeCallDatas,
          resourceConsumption.assetIds,
          i == 0,
        ),
    );

    // Trigger building of inner rollups in parallel.
    const rollupProofDaos = await Promise.all(
      txRollups.map((txRollup, i) =>
        this.rollupCreator.create(
          chunkedTx[i].map(rollupTx => rollupTx.tx),
          txRollup,
        ),
      ),
    );

    const rollupDao = await this.rollupAggregator.aggregateRollupProofs(
      rollupProofDaos,
      this.oldDefiRoot,
      this.oldDefiPath,
      this.defiInteractionNotes,
      resourceConsumption.bridgeCallDatas.concat(
        Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - resourceConsumption.bridgeCallDatas.length).fill(0n),
      ),
      [...resourceConsumption.assetIds],
    );

    rollupProfile.published = await this.checkpointAndPublish(rollupDao, rollupProfile);

    // calc & store published rollup's bridge metrics
    if (rollupProfile.published) {
      try {
        await this.metrics.rollupPublished(
          rollupProfile,
          rollupDao.rollupProof?.txs ?? [],
          rollupDao.id,
          this.feeResolver,
          bridgeSubsidyProvider,
        );
      } catch (err) {
        this.log('RollupCoordinator: Error when registering published rollup metrics', err);
      }
    }

    return rollupProfile;
  }

  private checkpoint() {
    if (this.interrupted) {
      this.state = RollupCoordinatorState.INTERRUPTED;
      throw new InterruptError('Interrupted.');
    }
  }

  private async checkpointAndPublish(rollupDao: RollupDao, rollupProfile: RollupProfile) {
    this.checkpoint();
    this.state = RollupCoordinatorState.PUBLISHING;
    return await this.rollupPublisher.publishRollup(rollupDao, rollupProfile.totalGas);
  }

  private async printRollupState(rollupProfile: RollupProfile, timeout: boolean, flush: boolean, limit: boolean) {
    this.log(`RollupCoordinator: Creating rollup...`);
    this.log(`RollupCoordinator:   rollupSize: ${rollupProfile.rollupSize}`);
    const secondClassStr = rollupProfile.totalSecondClassTxs ? ` (${rollupProfile.totalSecondClassTxs} 2nd-class)` : '';
    this.log(`RollupCoordinator:   numTxs: ${rollupProfile.totalTxs}${secondClassStr}`);
    for (let t = 0; t < numTxTypes; t++) {
      const txType = TxType[t].toLowerCase();
      const numSecondClassForType = rollupProfile.numSecondClassTxsPerType[t];
      const secondClassStr = numSecondClassForType ? ` (${numSecondClassForType} 2nd-class)` : '';
      this.log(`RollupCoordinator:     ${txType}: ${rollupProfile.numTxsPerType[t]}${secondClassStr}`);
    }
    this.log(`RollupCoordinator:   timeout/flush/limit: ${timeout}/${flush}/${limit}`);
    this.log(`RollupCoordinator:   aztecGas balance: ${rollupProfile.gasBalance}`);
    this.log(`RollupCoordinator:   inner/outer chains: ${rollupProfile.innerChains}/${rollupProfile.outerChains}`);
    this.log(`RollupCoordinator:   estimated L1 gas: ${rollupProfile.totalGas}`);
    this.log(`RollupCoordinator:   calldata: ${rollupProfile.totalCallData} bytes`);
    for (const bp of rollupProfile.bridgeProfiles.values()) {
      const bridgeDescription = await this.bridgeResolver.getBridgeDescription(bp.bridgeCallData);
      const descriptionLog = bridgeDescription ? `(${bridgeDescription})` : '';
      this.log(`RollupCoordinator: Defi bridge published: ${bp.bridgeCallData.toString()} ${descriptionLog}`);
      this.log(`RollupCoordinator:   numTxs: ${bp.numTxs}`);
      this.log(
        `RollupCoordinator:   gas balance (subsidy): ${bp.gasAccrued + bp.gasSubsidy - bp.gasThreshold} (${
          bp.gasSubsidy
        })`,
      );
    }
  }

  private rollupHasDeadlined(rollupTxs: RollupTx[], rollupProfile: RollupProfile, rollupTimeouts: RollupTimeouts) {
    // can't be deadlined if no txs
    if (!rollupProfile.totalTxs) {
      return false;
    }
    // can't be deadlined if no base timeout
    if (!rollupTimeouts.baseTimeout) {
      return false;
    }

    // do we have a non defi tx that has timed out?
    return rollupTxs
      .filter(tx => tx.tx.txType !== TxType.DEFI_DEPOSIT)
      .some(tx => tx.tx.created.getTime() < rollupTimeouts.baseTimeout!.timeout.getTime());
  }

  /**
   * Calculate the various conditions necessary to decide whether a rollup should be published.
   *
   * @param txs - list of txs to include in the rollup
   * @param rollupProfile - information regarding the current state of this rollup
   * @param rollupTimeouts - timeout information needed to determine whether the rollup has deadlined
   *
   * @return an object including the following conditions:
   *   * isProfitable - is this rollup profitable
   *   * deadline - has the rollup deadline been reached
   *   * outOfGas - has this rollup reached the gas limit
   *   * outOfCallData - has this rollup reached the callData limit
   *   * outOfSlots - have all rollup tx slots been filled
   */
  private getRollupPublishConditions(txs: RollupTx[], rollupProfile: RollupProfile, rollupTimeouts: RollupTimeouts) {
    // Profitable if gasBalance is equal or above what's needed.
    const isProfitable = rollupProfile.gasBalance >= 0;

    // If any tx in this rollup is older than it's deadline, then we've timedout and should publish.
    const deadline = this.rollupHasDeadlined(txs, rollupProfile, rollupTimeouts);

    // The amount of L1 gas remaining until we breach the gasLimit.
    const gasRemainingTillGasLimit = this.maxGasForRollup - rollupProfile.totalGas;

    // The amount of L1 calldata remaining until we breach the calldata limit.
    const callDataRemaining = this.maxCallDataForRollup - rollupProfile.totalCallData;

    // Verify the remaining resources against the max possible values of gas and calldata to determine if it is time
    // to publish. e.g. There are not enough resources left, to include an instant tx of any type.
    const outOfGas = gasRemainingTillGasLimit < this.feeResolver.getMaxUnadjustedGas();
    const outOfCallData = callDataRemaining < this.feeResolver.getMaxTxCallData();
    const outOfSlots = rollupProfile.totalTxs == this.totalSlots;

    return { isProfitable, deadline, outOfGas, outOfCallData, outOfSlots };
  }
}

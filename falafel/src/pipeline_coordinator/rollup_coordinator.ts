import { isAccountTx, isDefiDepositTx, TxType } from '@aztec/barretenberg/blockchain';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { asyncMap } from '@aztec/barretenberg/async_map';
import { BridgeResolver } from '../bridge';
import { TxDao } from '../entity/tx';
import { RollupAggregator } from '../rollup_aggregator';
import { RollupCreator } from '../rollup_creator';
import { RollupPublisher } from '../rollup_publisher';
import { TxFeeResolver } from '../tx_fee_resolver';
import { Metrics } from '../metrics';
import { BridgeTxQueue, createDefiRollupTx, createRollupTx, RollupTx, RollupResources } from './bridge_tx_queue';
import { PublishTimeManager, RollupTimeouts } from './publish_time_manager';
import { profileRollup, RollupProfile } from './rollup_profiler';

export class RollupCoordinator {
  private processedTxs: RollupTx[] = [];
  private bridgeQueues = new Map<bigint, BridgeTxQueue>();
  private totalSlots: number;

  constructor(
    private publishTimeManager: PublishTimeManager,
    private rollupCreator: RollupCreator,
    private rollupAggregator: RollupAggregator,
    private rollupPublisher: RollupPublisher,
    private numInnerRollupTxs: number,
    private numOuterRollupProofs: number,
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
    this.totalSlots = this.numOuterRollupProofs * this.numInnerRollupTxs;
  }

  public getProcessedTxs() {
    return this.processedTxs.map(rollupTx => rollupTx.tx);
  }

  public async interrupt() {
    this.processedTxs = [];
    await this.rollupCreator.interrupt();
    await this.rollupAggregator.interrupt();
    this.rollupPublisher.interrupt();
  }

  public async processPendingTxs(pendingTxs: TxDao[], flush = false): Promise<RollupProfile> {
    const rollupTimeouts = this.publishTimeManager.calculateLastTimeouts();
    this.initialiseBridgeQueues(rollupTimeouts);

    const { txs, bridgeIds, assetIds } = this.getNextTxsToRollup(pendingTxs, flush);

    return await this.aggregateAndPublish(txs, bridgeIds, assetIds, rollupTimeouts, flush);
  }

  private initialiseBridgeQueues(rollupTimeouts: RollupTimeouts) {
    this.bridgeQueues = new Map<bigint, BridgeTxQueue>();
    for (const { bridgeId } of this.bridgeResolver.getBridgeConfigs()) {
      const bt = rollupTimeouts.bridgeTimeouts.get(bridgeId);
      this.bridgeQueues.set(bridgeId, new BridgeTxQueue(bridgeId, this.feeResolver, bt));
    }
  }

  private getNextTxsToRollup(pendingTxs: TxDao[], flush: boolean) {
    // Gas should be thought of as "layer 2 gas". It's a universal unit of cost for producing a rollup.
    // The initial gasUsed, in an empty rollup, is the cost of verification.
    // Hence total slots * verification gas per slot.
    const resourceConsumption: RollupResources = {
      gasUsed: this.totalSlots * this.feeResolver.getUnadjustedBaseVerificationGas(),
      callDataUsed: 0,
      bridgeIds: [],
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
        txs = this.handleNewDefiTx(tx, this.totalSlots - txs.length, flush, resourceConsumption, txs);
        // txs.push(...txsToAdd);
      }
    }

    return {
      txs,
      bridgeIds: resourceConsumption.bridgeIds,
      assetIds: resourceConsumption.assetIds,
    };
  }

  // If txs are added in this function, then the provided resource consumption will be updated to include the resources
  // consumed by those txs.
  private handleNewDefiTx(
    tx: TxDao,
    remainingTxSlots: number,
    flush: boolean,
    currentConsumption: RollupResources,
    txsForRollup: RollupTx[],
  ): RollupTx[] {
    // We have a new defi interaction, we need to determine if it can be accepted and if so whether it gets queued or
    // goes straight on chain.
    const proof = new ProofData(tx.proofData);
    const defiProof = new DefiDepositProofData(proof);
    const rollupTx = createDefiRollupTx(tx, defiProof);
    const bridgeId = rollupTx.bridgeId!;
    const bridgeAlreadyPresentInRollup = currentConsumption.bridgeIds.some(id => id === bridgeId);
    // const txsForRollup: RollupTx[] = [];

    const addTxs = (txs: RollupTx[]) => {
      for (const tx of txs) {
        txsForRollup.push(tx);
        if (tx.fee.value && this.feeResolver.isFeePayingAsset(tx.fee.assetId)) {
          currentConsumption.assetIds.add(tx.fee.assetId);
        }
        if (!currentConsumption.bridgeIds.some(id => id === bridgeId)) {
          currentConsumption.bridgeIds.push(tx.bridgeId!);
        }
      }
    };

    const verifyResourceLimits = (txs: RollupTx[]) => {
      let totalGasUsedInRollup = currentConsumption.gasUsed;
      if (!bridgeAlreadyPresentInRollup) {
        // we need the full bridge gas from the contract as this is the value that does not include any subsidy
        totalGasUsedInRollup += this.feeResolver.getFullBridgeGasFromContract(bridgeId);
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

    if (currentConsumption.bridgeIds.length === RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
      // this rollup doesn't have any txs for this bridge and can't take any more
      return txsForRollup;
    }

    if (flush) {
      // we have been told to flush, add it straight into the rollup
      checkAndAddTxs([rollupTx]);
      return txsForRollup;
    }

    let bridgeQueue = this.bridgeQueues.get(bridgeId);

    if (!bridgeQueue) {
      // We don't have a bridge config for this!!
      this.bridgeQueues.set(bridgeId, new BridgeTxQueue(bridgeId, this.feeResolver));
      bridgeQueue = this.bridgeQueues.get(bridgeId)!;
    }

    //if we are beyond the timeout interval for this bridge then add it straight in
    if (bridgeQueue.transactionHasTimedOut(rollupTx)) {
      checkAndAddTxs([rollupTx]);
      return txsForRollup;
    }

    // Add this tx to the queue for this bridge and work out if we can put any more txs into the current batch or create
    // a new one.
    bridgeQueue.addDefiTx(rollupTx);
    const gasRemainingInRollup = this.maxGasForRollup - currentConsumption.gasUsed;
    const callDataRemainingInRollup = this.maxCallDataForRollup - currentConsumption.callDataUsed;
    const bridgeQueueResult = bridgeQueue.getTxsToRollup(
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
    bridgeIds: bigint[],
    assetIds: Set<number>,
    rollupTimeouts: RollupTimeouts,
    flush: boolean,
  ) {
    if (txsToRollup.length > this.totalSlots) {
      // This shouldn't happen!
      throw new Error(`txsToRollup.length > numRemainingSlots: ${txsToRollup.length} > ${this.totalSlots}`);
    }

    const rollupProfile = profileRollup(txsToRollup, this.feeResolver, this.numInnerRollupTxs, this.totalSlots);

    if (!rollupProfile.totalTxs) {
      // No txs at all.
      return rollupProfile;
    }

    const bridgeConfigs = this.bridgeResolver.getBridgeConfigs();
    this.metrics.recordRollupMetrics(txsToRollup, rollupProfile, bridgeConfigs);

    // Profitable if gasBalance is equal or above what's needed.
    const isProfitable = rollupProfile.gasBalance >= 0;

    // If any tx in this rollup is older than the deadline, then we've timedout and should publish.
    const timedout = rollupTimeouts.baseTimeout
      ? rollupProfile.earliestTx.getTime() <= rollupTimeouts.baseTimeout.timeout.getTime()
      : false;

    // The amount of L1 gas remaining until we breach the gasLimit.
    const gasRemainingTillGasLimit = this.maxGasForRollup - rollupProfile.totalGas;

    // The amount of L1 calldata remaining until we breach the calldata limit.
    const callDataRemaining = this.maxCallDataForRollup - rollupProfile.totalCallData;

    // Verify the remaining resources against the max possible values of gas and calldata to determine if it is time
    // to publish. e.g. There are not enough resources left, to include an instant tx of any type.
    const outOfGas = gasRemainingTillGasLimit < this.feeResolver.getMaxUnadjustedGas();
    const outOfCallData = callDataRemaining < this.feeResolver.getMaxTxCallData();
    const outOfSlots = txsToRollup.length == this.totalSlots;
    const shouldPublish = flush || isProfitable || timedout || outOfGas || outOfCallData || outOfSlots;

    if (!shouldPublish) {
      return rollupProfile;
    }

    this.printRollupState(rollupProfile, timedout, flush, outOfGas || outOfCallData || outOfSlots);

    // Track txs currently being processed. Gives clients a view into what's being processed.
    this.processedTxs = [...txsToRollup];

    // Chunk txs for each inner rollup.
    const chunkedTx: RollupTx[][] = [];
    while (txsToRollup.length) {
      chunkedTx.push(txsToRollup.splice(0, this.numInnerRollupTxs));
    }

    // First create circuit input data. In sequence as it updates the merkle trees.
    const txRollups = await asyncMap(
      chunkedTx,
      async (innerRollupTxs, i) =>
        await this.rollupCreator.createRollup(
          innerRollupTxs.map(rollupTx => rollupTx.tx),
          bridgeIds,
          assetIds,
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
      bridgeIds.concat(Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - bridgeIds.length).fill(0n)),
      [...assetIds],
    );

    rollupProfile.published = await this.rollupPublisher.publishRollup(rollupDao, rollupProfile.totalGas);

    // calc & store published rollup's bridge metrics
    if (rollupProfile.published) {
      this.metrics
        .rollupPublished(rollupProfile, rollupDao.rollupProof?.txs, rollupDao.id)
        .catch(err => this.log('Error when registering published rollup metrics', err));
    }

    return rollupProfile;
  }

  private printRollupState(rollupProfile: RollupProfile, timeout: boolean, flush: boolean, limit: boolean) {
    this.log(`RollupCoordinator: Creating rollup...`);
    this.log(`RollupCoordinator:   rollupSize: ${rollupProfile.rollupSize}`);
    this.log(`RollupCoordinator:   numTxs: ${rollupProfile.totalTxs}`);
    rollupProfile.numTxsPerType.forEach((v, i) => this.log(`RollupCoordinator:     ${TxType[i].toLowerCase()}: ${v}`));
    this.log(`RollupCoordinator:   timeout/flush/limit: ${timeout}/${flush}/${limit}`);
    this.log(`RollupCoordinator:   aztecGas balance: ${rollupProfile.gasBalance}`);
    this.log(`RollupCoordinator:   inner/outer chains: ${rollupProfile.innerChains}/${rollupProfile.outerChains}`);
    this.log(`RollupCoordinator:   estimated L1 gas: ${rollupProfile.totalGas}`);
    this.log(`RollupCoordinator:   calldata: ${rollupProfile.totalCallData} bytes`);
    for (const bp of rollupProfile.bridgeProfiles.values()) {
      this.log(`RollupCoordinator: Defi bridge published: ${bp.bridgeId.toString()}`);
      this.log(`RollupCoordinator:   numTxs: ${bp.numTxs}`);
      this.log(`RollupCoordinator:   gas balance: ${bp.gasAccrued - bp.gasThreshold}`);
    }
  }
}

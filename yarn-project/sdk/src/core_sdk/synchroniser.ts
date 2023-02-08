import { InitHelpers } from '@aztec/barretenberg/environment';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { Mutex } from '@aztec/barretenberg/mutex';
import { retry } from '@aztec/barretenberg/retry';
import {
  InitialWorldState,
  initialWorldStateFromBuffer,
  initialWorldStateToBuffer,
  RollupProvider,
} from '@aztec/barretenberg/rollup_provider';
import { Timer } from '@aztec/barretenberg/timer';
import { WorldState } from '@aztec/barretenberg/world_state';
import { LevelUp } from 'levelup';
import { BlockContext } from '../block_context/block_context.js';
import { Alias, Database } from '../database/index.js';
import { parseGenesisAliasesAndKeys } from '../genesis_state/index.js';
import { Pedersen } from '../index.js';
import { UserState } from '../user_state/index.js';
import { BlockDownloader } from './block_downloader.js';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { BoundedSerialQueue } from '@aztec/barretenberg/fifo';
import { SdkEvent } from './sdk_status.js';
import { EventEmitter } from 'events';
import { SerialQueue } from '../serial_queue/index.js';
import { sendClientLog } from '../client_log/client_log.js';

export interface SyncStatus {
  syncedToRollup: number;
  latestRollupId: number;
  dataRoot: Buffer;
  dataSize: number;
}

/**
 * For serial debugging logs and accurate timings, set `serialize` to true.
 * This prevents buffering and concurrent processing of the data pipeline.
 */
export class Synchroniser extends EventEmitter {
  private debug = createDebugLogger('bb:synchroniser');
  private running = false;
  private genesisSyncMutex: Mutex;
  private syncMutex: Mutex;
  private synchingPromise!: Promise<void>;
  private blockDownloader?: BlockDownloader;
  private syncStatus: SyncStatus;
  private userStates: UserState[] = [];
  private onAbortCallbacks: ((err: Error) => any)[] = [];

  constructor(
    private rollupProvider: RollupProvider,
    private worldState: WorldState,
    private leveldb: LevelUp,
    private db: Database,
    private pedersen: Pedersen,
    private serialQueue: SerialQueue,
    private serialize = false,
    private mutexTimeout = 30000,
  ) {
    super();

    this.genesisSyncMutex = new Mutex(this.db, 'aztec_core_sdk_genesis_sync', this.mutexTimeout);
    this.syncMutex = new Mutex(this.db, 'aztec_core_sdk_sync', this.mutexTimeout);
    this.syncStatus = {
      syncedToRollup: -1,
      latestRollupId: -1,
      dataSize: 0,
      dataRoot: Buffer.alloc(0),
    };
  }

  public async init() {
    this.syncStatus = {
      syncedToRollup: await this.getSyncedToRollup(),
      latestRollupId: await this.rollupProvider.getLatestRollupId(),
      dataSize: this.worldState.getSize(),
      dataRoot: this.worldState.getRoot(),
    };
  }

  public getSyncStatus() {
    return this.syncStatus;
  }

  public setUserStates(userStates: UserState[]) {
    this.userStates = userStates;
  }

  public async start() {
    this.running = true;

    // Only one tab to do genesis sync at a time.
    await this.genesisSyncMutex.lock();

    const initialState = await this.retrieveGenesisData();

    // Start the block downloader syncing from lowest sync point of data tree and user states.
    // Each request returns 128 blocks, so 10 queue items is 1280 blocks total.
    await this.readSyncInfo();
    const { syncedToRollup } = this.syncStatus;
    const from = Math.min(syncedToRollup, ...this.userStates.map(us => us.getUserData().syncedToRollup)) + 1;
    this.blockDownloader = new BlockDownloader(this.rollupProvider, 10, initialState.initialSubtreeRoots.length);
    this.blockDownloader.start(from);

    await this.genesisSync(initialState);

    await this.genesisSyncMutex.unlock();

    this.synchingPromise = this.startSync();
  }

  public async stop() {
    this.running = false;
    await this.blockDownloader?.stop();
    await this.synchingPromise;
  }

  public onAbort(cb: (err: Error) => any) {
    this.onAbortCallbacks.push(cb);
  }

  public async retrieveGenesisData() {
    const stored = await this.db.getKey('genesisData');
    if (stored) {
      return initialWorldStateFromBuffer(stored);
    }
    this.debug('genesis data not found locally, retrieving from server...');
    const initialWorldState = await retry(() => this.rollupProvider.getInitialWorldState(), 'get initial world state');
    const { initialAccounts, initialSubtreeRoots } = initialWorldState;
    this.debug(`genesis state ${initialAccounts.length} bytes, ${initialSubtreeRoots.length} sub-tree roots.`);
    await this.db.addKey('genesisData', initialWorldStateToBuffer(initialWorldState));
    return initialWorldState;
  }

  // PRIVATE FUNCTIONS

  /**
   * If the world state has no data, download the initial world state data and process it.
   * Returns the initial tree size (e.g. 73 for aztec-connect production).
   */
  private async genesisSync(initialState: InitialWorldState, commitmentsOnly = false) {
    if (this.worldState.getSize() === 0) {
      const genesisTimer = new Timer();
      if (!commitmentsOnly) {
        const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
        const genesisData = parseGenesisAliasesAndKeys(accounts);
        this.debug(`storing aliases to db...`);
        await this.db.addAliases(genesisData.aliases);
      }

      await this.worldState.insertElements(0, initialState.initialSubtreeRoots);
      this.debug(`genesis sync complete in ${genesisTimer.s()}s`);
    }
  }

  private async startSync() {
    const serialQueue = new BoundedSerialQueue(10);

    try {
      this.debug('starting sync task, acquiring mutex...');

      // Only one tab to synchronise at a time.
      while (this.running) {
        const acquired = await this.syncMutex.lock(false);
        // Wether we acquire the lock or not, read the latest persisted state.
        await this.readSyncInfo();
        if (acquired) {
          this.debug('sync mutex acquired.');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      serialQueue.start();

      while (this.running) {
        const blocks = await this.blockDownloader!.getBlocks();
        if (!blocks.length) {
          continue;
        }

        const from = blocks[0].rollupId;
        this.debug(`creating block contexts for ${blocks.length} blocks: ${from} to ${from + blocks.length - 1}...`);
        const blockContexts = blocks.map(b => BlockContext.fromBlock(b, this.pedersen));

        // Push block context on bounded queue. Will block to ensure there are no more than 10 on the queue.
        await serialQueue.put(async () => {
          await this.handleBlockContexts(blockContexts).catch(async error => {
            await this.abortSync('handleBlockContexts failed', error);
          });

          // Forward blocks to user states. This must happen after world state has been updated with those blocks so
          // that we can get the correct hash paths for the decrypted notes or spending keys added in user states.
          this.debug(`forwarding ${blocks.length} blocks to ${this.userStates.length} user states...`);
          if (this.serialize) {
            for (const userState of this.userStates) {
              await userState.processBlocks(blockContexts);
              await userState.flush();
            }
          } else {
            // Push block context to each user states queue. The queues are bounded, this blocks to ensure there are
            // no more than 10 block contexts on each queue.
            await Promise.all(this.userStates.map(us => us.processBlocks(blockContexts)));
          }
        });

        if (this.serialize) {
          await serialQueue.syncPoint();
        }
      }
    } catch (error: any) {
      // We should never fail. All network io is in the block downloader and it handles it.
      await this.abortSync('startSync() failed', error);
    } finally {
      await serialQueue.cancel();
      await this.blockDownloader?.stop();
      await this.syncMutex.unlock();
      this.debug('stopped sync task.');
    }
  }

  /**
   * @notice Fetches blocks and applies them to both core and user states
   * @from Number of a block from which to sync
   */
  private async handleBlockContexts(blockContexts: BlockContext[]) {
    const coreBlockContexts = blockContexts.filter(b => b.rollup.rollupId > this.syncStatus.syncedToRollup);
    if (!coreBlockContexts.length) {
      return;
    }

    // For debugging corrupted data root.
    const oldRoot = this.worldState.getRoot();
    const oldSize = this.worldState.getSize();

    const from = blockContexts[0].block.rollupId;
    const to = blockContexts[blockContexts.length - 1].block.rollupId;
    this.debug(`updating data tree and aliases for ${blockContexts.length} blocks: ${from} to ${to}...`);
    const timer = new Timer();

    // First bring the core in sync (mutable data tree layers and accounts).
    const rollups = coreBlockContexts.map(bc => bc.rollup);
    const offchainTxData = coreBlockContexts.map(bc => bc.block.offchainTxData);
    const subtreeRoots = coreBlockContexts.map(bc => bc.block.subtreeRoot!);

    if (this.serialize) {
      await this.serialQueue.push(() => this.worldState.insertElements(rollups[0].dataStartIndex, subtreeRoots));
      await this.processAliases(rollups, offchainTxData);
    } else {
      await Promise.all([
        this.serialQueue.push(() => this.worldState.insertElements(rollups[0].dataStartIndex, subtreeRoots)),
        this.processAliases(rollups, offchainTxData),
      ]);
    }
    await this.writeSyncInfo(rollups[rollups.length - 1].rollupId);

    this.debug(`updating data tree and aliases done in ${timer.ms()}ms.`);

    // TODO: Ugly hotfix. Find root cause.
    // We expect our data root to be equal to the new data root in the last block we processed.
    // UPDATE: Possibly solved. But leaving in for now. Can monitor for clientLogs.
    const expectedDataRoot = rollups[rollups.length - 1].newDataRoot;
    const newRoot = this.worldState.getRoot();
    if (!newRoot.equals(expectedDataRoot)) {
      const newSize = this.worldState.getSize();

      // Erase the db so that we can rebuild the merkle tree.
      this.debug('erasing data tree...');
      await this.leveldb.clear();
      await this.writeSyncInfo(-1);
      // Build the merkle tree with genesis data, but skip the aliases because we didn't erase them.
      const initialState = await this.retrieveGenesisData();
      await this.genesisSync(initialState, false);

      await this.abortSync('Invalid dataRoot.', undefined, {
        synchingFromRollup: from,
        blocksReceived: coreBlockContexts.length,
        oldRoot: oldRoot.toString('hex'),
        newRoot: newRoot.toString('hex'),
        newSize,
        oldSize,
        expectedDataRoot: expectedDataRoot.toString('hex'),
      });
    }
  }

  /**
   * Brings this.syncStatus, and user states in line with what's persisted.
   */
  private async readSyncInfo() {
    const syncedToRollup = await this.getSyncedToRollup();
    const latestRollupId = await this.rollupProvider.getLatestRollupId();
    this.syncStatus.latestRollupId = latestRollupId;

    if (this.syncStatus.syncedToRollup < syncedToRollup) {
      await this.worldState.syncFromDb();
      this.syncStatus.syncedToRollup = syncedToRollup;
      this.syncStatus.dataRoot = this.worldState.getRoot();
      this.syncStatus.dataSize = this.worldState.getSize();
      this.emit(SdkEvent.UPDATED_WORLD_STATE, this.syncStatus);
    }

    await Promise.all(this.userStates.map(us => us.syncFromDb()));
  }

  /**
   * Persist new syncedToRollup and update this.sdkStatus.
   */
  private async writeSyncInfo(syncedToRollup: number) {
    // This is the "source-of-truth" r.e. what rollup we're synced to.
    await this.leveldb.put('syncedToRollup', syncedToRollup.toString());

    this.syncStatus.syncedToRollup = syncedToRollup;
    this.syncStatus.dataRoot = this.worldState.getRoot();
    this.syncStatus.dataSize = this.worldState.getSize();

    // Keep latestRollupId up-to-date, but only once we know it's lagging.
    // Prevents stalling the compute pipeline on network io.
    if (this.syncStatus.syncedToRollup > this.syncStatus.latestRollupId) {
      this.debug('refreshing latest rollup id...');
      await retry(
        async () => (this.syncStatus.latestRollupId = await this.rollupProvider.getLatestRollupId()),
        'get latest rollup id',
      );
    }

    this.emit(SdkEvent.UPDATED_WORLD_STATE, this.syncStatus);
  }

  private async processAliases(rollups: RollupProofData[], offchainTxData: Buffer[][]) {
    const processRollup = (rollup: RollupProofData, offchainData: Buffer[]) => {
      const aliasMap: { [key: string]: Alias } = {};
      let offchainIndex = -1;

      for (let i = 0; i < rollup.innerProofData.length; ++i) {
        const proof = rollup.innerProofData[i];
        if (proof.isPadding()) {
          continue;
        }

        offchainIndex++;

        if (proof.proofId !== ProofId.ACCOUNT) {
          continue;
        }

        const createOrMigrate = !!toBigIntBE(proof.nullifier2);
        if (createOrMigrate) {
          const ocd = OffchainAccountData.fromBuffer(offchainData[offchainIndex]);
          const { accountPublicKey, aliasHash, spendingPublicKey1 } = ocd;
          const { noteCommitment1 } = proof;
          aliasMap[aliasHash.toString()] = {
            accountPublicKey,
            aliasHash,
            index: rollup.dataStartIndex + i * 2,
            noteCommitment1,
            spendingPublicKeyX: spendingPublicKey1.subarray(0, 32),
          };
        }
      }

      return Object.values(aliasMap);
    };

    const aliases = rollups.map((rollup, i) => processRollup(rollup, offchainTxData[i])).flat();
    const upsertTimer = new Timer();
    this.debug(`upserting ${aliases.length} accounts...`);
    await this.db.addAliases(aliases);
    this.debug(`upsert done in ${upsertTimer.ms()}ms...`);
  }

  private async getSyncedToRollup() {
    return +(await this.leveldb.get('syncedToRollup').catch(() => -1));
  }

  private async abortSync(message: string, error = new Error(message), log: any = {}) {
    if (this.running) {
      this.debug(message, error);
      await sendClientLog(
        this.rollupProvider,
        {
          ...log,
          message,
          error,
        },
        this.debug,
      );
      void this.stop();
      this.onAbortCallbacks.forEach(cb => cb(error));
    }
    throw error;
  }
}

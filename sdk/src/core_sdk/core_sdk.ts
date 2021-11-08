import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { AccountProver, JoinSplitProver, PooledProverFactory, ProofId } from '@aztec/barretenberg/client_proofs';
import { Crs } from '@aztec/barretenberg/crs';
import { Blake2s, Pedersen, PooledPedersen, Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider, SettlementTime } from '@aztec/barretenberg/rollup_provider';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { WorldState } from '@aztec/barretenberg/world_state';
import { AccountData, InitHelpers } from '@aztec/barretenberg/environment';
import createDebug from 'debug';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import Mutex from 'idb-mutex';
import { LevelUp } from 'levelup';
import os from 'os';
import { Alias, Database, SigningKey } from '../database';
import { AccountProofCreator } from '../proofs/account_proof_creator';
import { DefiDepositProofCreator } from '../proofs/defi_deposit_proof_creator';
import { JoinSplitProofCreator } from '../proofs/join_split_proof_creator';
import { ProofOutput } from '../proofs/proof_output';
import { SdkEvent, SdkInitState, SdkStatus } from '../sdk';
import { SchnorrSigner, Signer } from '../signer';
import { AccountId, UserData, UserDataFactory } from '../user';
import { UserState, UserStateEvent, UserStateFactory } from '../user_state';

const debug = createDebug('bb:core_sdk');

/**
 * These are events that are only emitted due to changes triggered within the current execution context.
 * Primarily, these are hooked into a broadcast channel to notify other instances of state changes.
 * Treat CoreSdkEvents as events for synchronising state between SDK instances, and SdkEvents for notifying UI changes.
 */
export enum CoreSdkEvent {
  // The world state db has been updated.
  UPDATED_WORLD_STATE = 'CORESDKEVENT_UPDATED_WORLD_STATE',
  // The set of users changed.
  UPDATED_USERS = 'CORESDKEVENT_UPDATED_USERS',
  // The state of a user has changed.
  UPDATED_USER_STATE = 'CORESDKEVENT_UPDATED_USER_STATE',
}

export interface CoreSdkOptions {
  saveProvingKey?: boolean;
}

export class CoreSdk extends EventEmitter {
  private worldState!: WorldState;
  private userStates: UserState[] = [];
  private workerPool!: WorkerPool;
  private joinSplitProofCreator!: JoinSplitProofCreator;
  private accountProofCreator!: AccountProofCreator;
  private defiDepositProofCreator!: DefiDepositProofCreator;
  private blockQueue!: MemoryFifo<Block>;
  private serialQueue = new MemoryFifo<() => Promise<void>>();
  private userFactory!: UserDataFactory;
  private userStateFactory!: UserStateFactory;
  private mutex = !isNode ? new Mutex('core-sdk-mutex', undefined, { expiry: 300 * 1000, spinDelay: 1000 }) : undefined;
  private numCPU = !isNode ? navigator.hardwareConcurrency || 2 : os.cpus().length;
  private sdkStatus: SdkStatus = {
    chainId: -1,
    rollupContractAddress: EthAddress.ZERO,
    syncedToRollup: -1,
    latestRollupId: -1,
    initState: SdkInitState.UNINITIALIZED,
    dataRoot: Buffer.alloc(0),
    dataSize: 0,
    assets: [],
  };
  private processBlocksPromise?: Promise<void>;
  private blake2s!: Blake2s;
  private pedersen!: Pedersen;
  private schnorr!: Schnorr;
  private grumpkin!: Grumpkin;

  constructor(
    private leveldb: LevelUp,
    private db: Database,
    private rollupProvider: RollupProvider,
    private options: CoreSdkOptions,
  ) {
    super();
  }

  private nextLowestPowerOf2(n: number) {
    return Math.pow(2, Math.floor(Math.log(n) / Math.log(2)));
  }

  public async init() {
    if (this.sdkStatus.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Sdk is not UNINITIALIZED.');
    }

    this.updateInitState(SdkInitState.INITIALIZING);

    // Start processing serialization queue.
    this.serialQueue.process(fn => fn());

    const barretenberg = await BarretenbergWasm.new();
    const numWorkers = this.nextLowestPowerOf2(Math.min(this.numCPU, 8));
    this.workerPool = await WorkerPool.new(barretenberg, numWorkers);

    const noteAlgos = new NoteAlgorithms(barretenberg, this.workerPool.workers[0]);
    this.blake2s = new Blake2s(barretenberg);
    this.pedersen = new PooledPedersen(barretenberg, this.workerPool);
    this.grumpkin = new Grumpkin(barretenberg);
    this.schnorr = new Schnorr(barretenberg);
    this.userFactory = new UserDataFactory(this.grumpkin);
    this.userStateFactory = new UserStateFactory(this.grumpkin, noteAlgos, this.db, this.rollupProvider);
    this.worldState = new WorldState(this.leveldb, this.pedersen);

    await this.initUserStates();

    await this.worldState.init();

    const {
      blockchainStatus: { chainId, rollupContractAddress, verifierContractAddress, assets },
    } = await this.getRemoteStatus();

    const currentVerifierContractAddress = await this.getVerifierContractAddress();
    const verifierContractChanged = currentVerifierContractAddress
      ? !currentVerifierContractAddress.equals(verifierContractAddress)
      : true;

    // TODO: Refactor all leveldb saved config into a little PersistentConfig class with getters/setters.
    await this.leveldb.put('rollupContractAddress', rollupContractAddress.toBuffer());
    await this.leveldb.put('verifierContractAddress', verifierContractAddress.toBuffer());

    this.sdkStatus = {
      ...this.sdkStatus,
      chainId,
      rollupContractAddress: rollupContractAddress,
      dataSize: this.worldState.getSize(),
      dataRoot: this.worldState.getRoot(),
      syncedToRollup: await this.getSyncedToRollup(),
      latestRollupId: +(await this.leveldb.get('latestRollupId').catch(() => -1)),
      assets,
    };

    // Create provers
    const crsData = await this.getCrsData(JoinSplitProver.circuitSize);
    const pooledProverFactory = new PooledProverFactory(this.workerPool, crsData);

    const joinSplitProver = new JoinSplitProver(
      await pooledProverFactory.createUnrolledProver(JoinSplitProver.circuitSize),
    );
    this.joinSplitProofCreator = new JoinSplitProofCreator(
      joinSplitProver,
      noteAlgos,
      this.worldState,
      this.grumpkin,
      this.db,
    );
    this.defiDepositProofCreator = new DefiDepositProofCreator(
      joinSplitProver,
      noteAlgos,
      this.worldState,
      this.grumpkin,
      this.db,
    );
    const accountProver = new AccountProver(await pooledProverFactory.createUnrolledProver(AccountProver.circuitSize));
    this.accountProofCreator = new AccountProofCreator(accountProver, this.worldState, this.db);
    await this.createJoinSplitProvingKey(joinSplitProver, verifierContractChanged);
    await this.createAccountProvingKey(accountProver, verifierContractChanged);

    this.updateInitState(SdkInitState.INITIALIZED);
  }

  public async getRollupContractAddress() {
    const result: Buffer | undefined = await this.leveldb.get('rollupContractAddress').catch(() => undefined);
    return result ? new EthAddress(result) : undefined;
  }

  private async getVerifierContractAddress() {
    const result: Buffer | undefined = await this.leveldb.get('verifierContractAddress').catch(() => undefined);
    return result ? new EthAddress(result) : undefined;
  }

  /**
   * Erase both leveldb and sql db. Must be called before calling init().
   */
  public async eraseDb() {
    await this.leveldb.clear();
    await this.db.clear();
  }

  private async getCrsData(circuitSize: number) {
    let crsData = await this.db.getKey(`crs-${circuitSize}`);
    if (!crsData) {
      this.logInitMsgAndDebug('Downloading CRS data...');
      const crs = new Crs(circuitSize);
      await crs.download();
      crsData = Buffer.from(crs.getData());
      await this.db.addKey(`crs-${circuitSize}`, crsData);
      debug('done.');
    }
    return crsData;
  }

  /**
   * Shutdown any existing `UserState` instances and wait for them to complete any processing.
   * Load the users from the database and create and initialize their new user states.
   * Emit SdkEvent.UPDATED_USERS to update the UI containing any user lists.
   * Emit SdkEvent.UPDATED_USER_STATE to update the UI for each user.
   * Register for changes to each user state and emit appropriate events.
   * If this SDK instance is handling blocks, start syncing the user states.
   *
   * Public, as it will be called in the event of another instance emitting CoreSdkEvent.UPDATED_USERS.
   */
  public async initUserStates() {
    await this.serialExecute(async () => {
      debug('initializing user states...');
      await this.stopSyncingUserStates();

      const users = await this.db.getUsers();
      this.userStates = users.map(u => this.userStateFactory.createUserState(u));
      await Promise.all(this.userStates.map(us => us.init()));

      this.emit(SdkEvent.UPDATED_USERS);

      this.userStates.forEach(us => this.startSyncingUserState(us));
    });
  }

  private startSyncingUserState(userState: UserState) {
    this.emit(SdkEvent.UPDATED_USER_STATE, userState.getUser().id);

    userState.on(
      UserStateEvent.UPDATED_USER_STATE,
      (id: Buffer, balanceAfter: bigint, diff: bigint, assetId: AssetId) => {
        this.emit(CoreSdkEvent.UPDATED_USER_STATE, id, balanceAfter, diff, assetId);
        this.emit(SdkEvent.UPDATED_USER_STATE, id, balanceAfter, diff, assetId);
      },
    );

    if (this.processBlocksPromise) {
      userState.startSync();
    }
  }

  private async stopSyncingUserStates() {
    for (const us of this.userStates) {
      us.removeAllListeners();
      await us.stopSync();
    }
  }

  private async createJoinSplitProvingKey(joinSplitProver: JoinSplitProver, forceCreate: boolean) {
    if (!forceCreate) {
      const provingKey = await this.db.getKey('join-split-proving-key');
      if (provingKey) {
        this.logInitMsgAndDebug('Loading join-split proving key...');
        await joinSplitProver.loadKey(provingKey);
        return;
      }
    }

    this.logInitMsgAndDebug('Computing join-split proving key...');
    const start = new Date().getTime();
    await joinSplitProver.computeKey();
    if (this.options.saveProvingKey) {
      this.logInitMsgAndDebug('Saving join-split proving key...');
      const newProvingKey = await joinSplitProver.getKey();
      await this.db.addKey('join-split-proving-key', newProvingKey);
    }
    debug(`complete: ${new Date().getTime() - start}ms`);
  }

  private async createAccountProvingKey(accountProver: AccountProver, forceCreate: boolean) {
    if (!forceCreate) {
      const provingKey = await this.db.getKey('account-proving-key');
      if (provingKey) {
        this.logInitMsgAndDebug('Loading account proving key...');
        await accountProver.loadKey(provingKey);
      }
    }

    this.logInitMsgAndDebug('Computing account proving key...');
    const start = new Date().getTime();
    await accountProver.computeKey();
    if (this.options.saveProvingKey) {
      this.logInitMsgAndDebug('Saving account proving key...');
      const newProvingKey = await accountProver.getKey();
      await this.db.addKey('account-proving-key', newProvingKey);
    }
    debug(`complete: ${new Date().getTime() - start}ms`);
  }

  public async destroy() {
    await this.stopSyncingUserStates();
    await this.stopReceivingBlocks();
    await this.workerPool?.destroy();
    await this.leveldb.close();
    await this.db.close();
    this.serialQueue.cancel();
    this.updateInitState(SdkInitState.DESTROYED);
    this.removeAllListeners();
  }

  private updateInitState(initState: SdkInitState) {
    this.sdkStatus.initState = initState;
    this.emit(SdkEvent.UPDATED_INIT_STATE, initState);
  }

  public getLocalStatus() {
    return { ...this.sdkStatus };
  }

  private logInitMsgAndDebug(msg: string) {
    this.emit(SdkEvent.LOG, msg);
    debug(msg.toLowerCase());
  }

  public async getRemoteStatus() {
    return await this.rollupProvider.getStatus();
  }

  public async getFee(assetId: AssetId, transactionType: TxType, speed: SettlementTime) {
    const { txFees } = await this.getRemoteStatus();
    return txFees[assetId].feeConstants[transactionType] + txFees[assetId].baseFeeQuotes[speed].fee;
  }

  private serialExecute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.serialQueue.put(async () => {
        try {
          // We use a mutex to ensure only one tab will process a queue element at a time.
          await this.mutex?.lock();
          const res = await fn();
          await this.mutex?.unlock();
          resolve(res);
        } catch (e) {
          await this.mutex?.unlock();
          reject(e);
        }
      });
    });
  }

  private async syncAliasesAndKeys(accounts: AccountData[]) {
    const aliases = new Array<Alias>();
    const uniqueSigningKeys = new Map<string, SigningKey>();
    let index = 0;

    // There can be duplicate account/nonce/signing key combinations.
    // We need to just keep the most recent one.
    // This loop simulates upserts by keeping the most recent version before inserting into the DB.
    for (let i = 0; i < accounts.length; i++) {
      const {
        alias: { address, nonce },
        signingKeys: { signingKey1, signingKey2 },
      } = accounts[i];
      const accountId = new AccountId(new GrumpkinAddress(address), nonce);

      [signingKey1, signingKey2].forEach(key => {
        const keyVal = key.toString('hex') + ' - ' + accountId.toString();
        const sk: SigningKey = { treeIndex: index++, key, accountId };
        uniqueSigningKeys.set(keyVal, sk);
      });

      aliases.push({
        aliasHash: new AliasHash(accounts[i].alias.aliasHash),
        address: new GrumpkinAddress(accounts[i].alias.address),
        latestNonce: accounts[i].alias.nonce,
      });
    }
    const keys = [...uniqueSigningKeys.values()];

    debug(`synching with ${aliases.length} aliases`);
    let start = new Date().getTime();
    await this.db.setAliases(aliases);
    debug(`aliases saved in ${new Date().getTime() - start}ms`);

    debug(`synching with ${keys.length} signing keys`);
    start = new Date().getTime();
    await this.db.addUserSigningKeys(keys);
    debug(`signing keys saved in ${new Date().getTime() - start}ms`);
  }

  private async syncCommitments(accounts: AccountData[]) {
    const start = new Date().getTime();
    const commitments = accounts.flatMap(x => [x.notes.note1, x.notes.note2]);
    debug(`synching with ${commitments.length} commitments`);
    await this.worldState.processNoteCommitments(0, commitments);
    debug(`note commitments saved in ${new Date().getTime() - start}ms`);
  }

  private async genesisSync() {
    debug('initialising genesis state from server...');
    const initialState = await this.rollupProvider.getInitialWorldState();
    const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
    await this.syncAliasesAndKeys(accounts);
    await this.syncCommitments(accounts);
  }

  private async getSyncedToRollup() {
    return +(await this.leveldb.get('syncedToRollup').catch(() => -1));
  }

  public async startReceivingBlocks() {
    await this.serialExecute(async () => {
      if (this.processBlocksPromise) {
        return;
      }

      {
        const syncedToRollup = await this.getSyncedToRollup();
        if (syncedToRollup === -1) {
          await this.genesisSync();
        }
      }

      this.blockQueue = new MemoryFifo<Block>();
      this.rollupProvider.on('block', b => this.blockQueue.put(b));
      this.userStates.forEach(us => us.startSync());
      this.processBlocksPromise = this.processBlockQueue();

      await this.sync();

      const syncedToRollup = await this.getSyncedToRollup();
      await this.rollupProvider.start(+syncedToRollup + 1);

      debug('started processing blocks.');
    }).catch(err => {
      debug('START RECEIVING BLOCKS FAILED:', err);
    });
  }

  /**
   * Called when data root is not as expected. We need to save parts of leveldb we don't want to lose, erase the db,
   * and rebuild the merkle tree.
   */
  private async eraseAndRebuildDataTree() {
    debug('erasing and rebuilding data tree...');

    const rca = await this.getRollupContractAddress();
    const rva = await this.getVerifierContractAddress();
    await this.leveldb.clear();
    await this.leveldb.put('rollupContractAddress', rca!.toBuffer());
    await this.leveldb.put('verifierContractAddress', rva!.toBuffer());

    await this.worldState.init();

    const initialState = await this.rollupProvider.getInitialWorldState();
    const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
    await this.syncCommitments(accounts);

    await this.sync();
  }

  private async sync() {
    const syncedToRollup = await this.getSyncedToRollup();
    const blocks = await this.rollupProvider.getBlocks(syncedToRollup + 1);

    debug(`blocks received from rollup provider: ${blocks.length}`);

    // For debugging.
    const oldRoot = this.worldState.getRoot();
    const oldSize = this.worldState.getSize();

    if (!blocks.length) {
      // TODO: Ugly hotfix. Find root cause.
      // If no new blocks, we expect our local data root to be equal to that on falafel.
      const { dataRoot: expectedDataRoot, dataSize: expectedDataSize } = (await this.getRemoteStatus())
        .blockchainStatus;
      if (!oldRoot.equals(expectedDataRoot)) {
        debug(`old root ${oldRoot.toString('hex')}, Expected root ${expectedDataRoot.toString('hex')}`);
        await this.eraseAndRebuildDataTree();
        await this.rollupProvider.clientLog({
          message: 'Invalid dataRoot.',
          synchingFromRollup: syncedToRollup,
          blocksReceived: blocks.length,
          currentRoot: oldRoot.toString('hex'),
          currentSize: oldSize,
          expectedDataRoot: expectedDataRoot.toString('hex'),
          expectedDataSize,
        });
      }
      return;
    }

    const rollups = blocks.map(b => RollupProofData.fromBuffer(b.rollupProofData));
    const offchainTxData = blocks.map(b => b.offchainTxData).flat();

    // For debugging.
    const expectedDataRoot = rollups[rollups.length - 1].newDataRoot;
    const expectedDataSize = rollups[0].dataStartIndex + rollups.reduce((a, r) => a + r.rollupSize * 2, 0);

    debug('synchronising data...');
    await this.worldState.processRollups(rollups);
    await this.processAliases(rollups, offchainTxData);
    await this.updateStatusRollupInfo(rollups[rollups.length - 1]);
    debug('done.');

    // TODO: Ugly hotfix. Find root cause.
    // We expect our data root to be equal to the new data root in the last block we processed.
    if (!this.worldState.getRoot().equals(expectedDataRoot)) {
      await this.eraseAndRebuildDataTree();
      this.rollupProvider.clientLog({
        message: 'Invalid dataRoot.',
        synchingFromRollup: syncedToRollup,
        blocksReceived: blocks.length,
        oldRoot: oldRoot.toString('hex'),
        oldSize,
        newRoot: this.worldState.getRoot().toString('hex'),
        newSize: this.worldState.getSize(),
        expectedDataRoot: expectedDataRoot.toString('hex'),
        expectedDataSize,
      });
      return;
    }

    // Forward the block on to each UserState for processing.
    for (const block of blocks) {
      this.userStates.forEach(us => us.processBlock(block));
    }
  }

  private async updateStatusRollupInfo(rollup: RollupProofData) {
    const rollupId = rollup.rollupId;
    const latestRollupId = this.rollupProvider.getLatestRollupId();
    await this.leveldb.put('syncedToRollup', rollupId.toString());
    await this.leveldb.put('latestRollupId', latestRollupId.toString());

    this.sdkStatus.syncedToRollup = rollupId;
    this.sdkStatus.latestRollupId = latestRollupId;
    this.sdkStatus.dataRoot = this.worldState.getRoot();
    this.sdkStatus.dataSize = this.worldState.getSize();

    this.emit(CoreSdkEvent.UPDATED_WORLD_STATE, rollupId, latestRollupId);
    this.emit(SdkEvent.UPDATED_WORLD_STATE, rollupId, latestRollupId);
  }

  private async stopReceivingBlocks() {
    await this.rollupProvider.stop();
    this.rollupProvider.removeAllListeners();
    this.blockQueue?.cancel();
    await this.processBlocksPromise;
    this.processBlocksPromise = undefined;
  }

  private async processBlockQueue() {
    while (true) {
      const block = await this.blockQueue.get();
      if (!block) {
        break;
      }

      await this.serialExecute(async () => {
        await this.worldState.syncFromDb().catch(() => {});
        const rollup = RollupProofData.fromBuffer(block.rollupProofData);
        await this.worldState.processRollup(rollup);
        await this.processAliases([rollup], block.offchainTxData);
        await this.updateStatusRollupInfo(rollup);

        // Forward the block on to each UserState for processing.
        this.userStates.forEach(us => us.processBlock(block));
      });
    }
  }

  private async processAliases(rollups: RollupProofData[], offchainTxData: Buffer[]) {
    const aliases = rollups
      .map(r => r.innerProofData)
      .flat()
      .filter(ip => ip.proofId !== ProofId.PADDING)
      .map((ip, i) => (ip.proofId === ProofId.ACCOUNT ? OffchainAccountData.fromBuffer(offchainTxData[i]) : undefined))
      .filter((p): p is OffchainAccountData => !!p)
      .map(({ accountPublicKey, accountAliasId }) => ({
        address: accountPublicKey,
        aliasHash: accountAliasId.aliasHash,
        latestNonce: accountAliasId.nonce,
      }));
    await this.db.setAliases(aliases);
  }

  /**
   * Called when another instance of the sdk has updated the world state db.
   */
  public notifyWorldStateUpdated() {
    this.serialExecute(async () => {
      await this.worldState.syncFromDb();
      this.sdkStatus.dataRoot = this.worldState.getRoot();
      this.sdkStatus.dataSize = this.worldState.getSize();
      this.sdkStatus.syncedToRollup = await this.getSyncedToRollup();
      this.sdkStatus.latestRollupId = +(await this.leveldb.get('latestRollupId').catch(() => -1));
      this.emit(SdkEvent.UPDATED_WORLD_STATE, this.sdkStatus.syncedToRollup, this.sdkStatus.latestRollupId);
    });
  }

  /**
   * Called when another instance of the sdk has updated a users state.
   * Call the user state init function to refresh users internal state.
   * Emit an SdkEvent to update the UI.
   */
  public async notifyUserStateUpdated(userId: AccountId, balanceAfter?: bigint, diff?: bigint, assetId?: AssetId) {
    await this.getUserState(userId)?.init();
    this.emit(SdkEvent.UPDATED_USER_STATE, userId, balanceAfter, diff, assetId);
  }

  /**
   * Return the latest nonce for a given public key, derived from chain data.
   */
  public async getLatestUserNonce(publicKey: GrumpkinAddress) {
    return (await this.db.getLatestNonceByAddress(publicKey)) || 0;
  }

  public async getAddressFromAlias(alias: string, nonce?: number) {
    const aliasHash = this.computeAliasHash(alias);
    return this.db.getAddressByAliasHash(aliasHash, nonce);
  }

  public async getAccountId(user: string | GrumpkinAddress, nonce?: number) {
    if (typeof user === 'string') {
      const publicKey = GrumpkinAddress.isAddress(user)
        ? GrumpkinAddress.fromString(user)
        : await this.getAddressFromAlias(user);
      if (!publicKey) {
        throw new Error('Alias not registered.');
      }
      const accountNonce = nonce !== undefined ? nonce : await this.getLatestUserNonce(publicKey);
      return new AccountId(publicKey, accountNonce);
    }

    const accountNonce = nonce !== undefined ? nonce : await this.getLatestUserNonce(user);
    return new AccountId(user, accountNonce);
  }

  public async isAliasAvailable(alias: string) {
    // TODO - request it from server so that we can also check those aliases in unsettled txs.
    const aliasHash = this.computeAliasHash(alias);
    const address = await this.db.getAddressByAliasHash(aliasHash);
    return !address;
  }

  public computeAliasHash(alias: string) {
    return AliasHash.fromAlias(alias, this.blake2s);
  }

  public createSchnorrSigner(privateKey: Buffer) {
    const publicKey = this.derivePublicKey(privateKey);
    return new SchnorrSigner(this.schnorr, publicKey, privateKey);
  }

  public async createJoinSplitProof(
    assetId: AssetId,
    userId: AccountId,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    signer: Signer,
    noteRecipient?: AccountId,
    publicOwner?: EthAddress,
  ) {
    return this.serialExecute(async () => {
      const userState = this.getUserState(userId);
      return this.joinSplitProofCreator.createProof(
        userState,
        publicInput,
        publicOutput,
        privateInput,
        recipientPrivateOutput,
        senderPrivateOutput,
        assetId,
        signer,
        noteRecipient,
        publicOwner,
      );
    });
  }

  public async createAccountProofSigningData(
    signingPubKey: GrumpkinAddress,
    alias: string,
    nonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
  ) {
    return this.serialExecute(async () => {
      const aliasHash = this.computeAliasHash(alias);
      const tx = await this.accountProofCreator.createAccountTx(
        signingPubKey,
        aliasHash,
        nonce,
        migrate,
        accountPublicKey,
        newAccountPublicKey,
        newSigningPubKey1,
        newSigningPubKey2,
      );
      return this.accountProofCreator.computeSigningData(tx);
    });
  }

  public async createAccountProof(
    userId: AccountId,
    signer: Signer,
    aliasHash: AliasHash,
    nonce: number,
    migrate: boolean,
    newSigningPublicKey1?: GrumpkinAddress,
    newSigningPublicKey2?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    return this.serialExecute(async () => {
      const newAccountPublicKey = newAccountPrivateKey ? this.derivePublicKey(newAccountPrivateKey) : undefined;
      return this.accountProofCreator.createProof(
        signer,
        aliasHash,
        nonce,
        migrate,
        userId.publicKey,
        newAccountPublicKey,
        newSigningPublicKey1,
        newSigningPublicKey2,
      );
    });
  }

  public async createDefiProof(
    bridgeId: BridgeId,
    userId: AccountId,
    depositValue: bigint,
    txFee: bigint,
    signer: Signer,
  ) {
    return this.serialExecute(async () => {
      const userState = this.getUserState(userId);
      return this.defiDepositProofCreator.createProof(userState, bridgeId, depositValue, txFee, signer);
    });
  }

  public async sendProof(proofOutput: ProofOutput, depositSignature?: Buffer) {
    const { tx } = proofOutput;
    const { userId } = tx;
    const userState = this.getUserState(userId);

    const { proofData, offchainTxData } = proofOutput;
    await this.rollupProvider.sendProof({ proofData, offchainTxData, depositSignature });

    await userState.addTx(tx);

    return tx.txHash;
  }

  private async isSynchronised() {
    const providerStatus = await this.rollupProvider.getStatus();
    const localDataRoot = this.worldState.getRoot();
    return localDataRoot.equals(providerStatus.blockchainStatus.dataRoot);
  }

  public async awaitSynchronised() {
    while (true) {
      try {
        if (await this.isSynchronised()) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        debug(err);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  public isUserSynching(userId: AccountId) {
    return this.getUserState(userId).isSyncing();
  }

  public async awaitUserSynchronised(userId: AccountId) {
    await this.getUserState(userId).awaitSynchronised();
  }

  public async awaitSettlement(txHash: TxHash, timeout = 300) {
    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting tx settlement: ${txHash}`);
      }

      if (await this.db.isUserTxSettled(txHash)) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private getUserState(userId: AccountId) {
    const userState = this.userStates.find(us => us.getUser().id.equals(userId));
    if (!userState) {
      throw new Error(`User not found: ${userId}`);
    }
    return userState;
  }

  public async userExists(userId: AccountId) {
    return !!(await this.db.getUser(userId));
  }

  public getUserData(userId: AccountId) {
    return this.getUserState(userId).getUser();
  }

  public getUsersData() {
    return this.userStates.map(us => us.getUser());
  }

  public derivePublicKey(privateKey: Buffer) {
    return this.userFactory.derivePublicKey(privateKey);
  }

  public async addUser(privateKey: Buffer, nonce?: number, noSync = false) {
    const publicKey = this.derivePublicKey(privateKey);
    const accountNonce = nonce ?? (await this.getLatestUserNonce(publicKey));

    let syncedToRollup = -1;
    if (noSync) {
      const {
        blockchainStatus: { nextRollupId },
      } = await this.getRemoteStatus();
      syncedToRollup = nextRollupId - 1;
    }

    const aliasHash = accountNonce > 0 ? await this.db.getAliasHashByAddress(publicKey) : undefined;
    const user = await this.userFactory.createUser(privateKey, accountNonce, aliasHash, syncedToRollup);
    if (await this.db.getUser(user.id)) {
      throw new Error(`User already exists: ${user.id}`);
    }

    return await this.addUserFromUserData(user);
  }

  private async addUserFromUserData(user: UserData) {
    await this.db.addUser(user);

    const userState = this.userStateFactory.createUserState(user);
    await userState.init();
    this.userStates.push(userState);

    this.emit(CoreSdkEvent.UPDATED_USERS);
    this.emit(SdkEvent.UPDATED_USERS);

    this.startSyncingUserState(userState);

    return user;
  }

  public async removeUser(userId: AccountId) {
    const userState = this.getUserState(userId);
    this.userStates = this.userStates.filter(us => us !== userState);
    userState.stopSync();
    await this.db.removeUser(userId);

    this.emit(CoreSdkEvent.UPDATED_USERS);
    this.emit(SdkEvent.UPDATED_USERS);
  }

  public async getSigningKeys(accountId: AccountId) {
    // TODO - fetch the keys from server so that the account doesn't have to be added locally.
    const keys = await this.db.getUserSigningKeys(accountId);
    return keys.map(k => k.key);
  }

  public getBalance(assetId: AssetId, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getBalance(assetId);
  }

  public async getMaxSpendableValue(assetId: AssetId, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getMaxSpendableValue(assetId);
  }

  public async getSpendableNotes(assetId: AssetId, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getSpendableNotes(assetId);
  }

  public async getSpendableSum(assetId: AssetId, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getSpendableSum(assetId);
  }

  public async getJoinSplitTxs(userId: AccountId) {
    return this.db.getJoinSplitTxs(userId);
  }

  public async getAccountTxs(userId: AccountId) {
    return this.db.getAccountTxs(userId);
  }

  public async getDefiTxs(userId: AccountId) {
    return this.db.getDefiTxs(userId);
  }

  public async getNotes(userId: AccountId) {
    return this.db.getUserNotes(userId);
  }
}

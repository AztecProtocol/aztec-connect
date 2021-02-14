import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { Block } from 'barretenberg/block_source';
import { AssetId } from 'barretenberg/asset';
import { AccountProver } from 'barretenberg/client_proofs/account_proof';
import { EscapeHatchProver } from 'barretenberg/client_proofs/escape_hatch_proof';
import { JoinSplitProver } from 'barretenberg/client_proofs/join_split_proof';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { PooledProverFactory } from 'barretenberg/client_proofs/prover';
import { Crs } from 'barretenberg/crs';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { MemoryFifo } from 'barretenberg/fifo';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { RollupProvider } from 'barretenberg/rollup_provider';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { WorkerPool } from 'barretenberg/wasm/worker_pool';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import isNode from 'detect-node';
import os from 'os';
import { EventEmitter } from 'events';
import Mutex from 'idb-mutex';
import { LevelUp } from 'levelup';
import { HashPathSource } from 'sriracha/hash_path_source';
import { Database } from '../database';
import { AccountProofCreator } from '../proofs/account_proof_creator';
import { EscapeHatchProofCreator } from '../proofs/escape_hatch_proof_creator';
import { JoinSplitProofCreator } from '../proofs/join_split_proof_creator';
import { SdkEvent, SdkInitState, SdkStatus } from '../sdk';
import { Signer } from '../signer';
import { SchnorrSigner } from '../signer';
import { AccountAliasId, UserDataFactory, AccountId, UserData } from '../user';
import { UserState, UserStateEvent, UserStateFactory } from '../user_state';
import { UserAccountTx, UserJoinSplitTx } from '../user_tx';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { EthereumSigner } from 'barretenberg/blockchain';
import { TxHash } from 'barretenberg/tx_hash';

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
  private joinSplitProofCreator!: JoinSplitProofCreator | EscapeHatchProofCreator;
  private accountProofCreator!: AccountProofCreator;
  private blockQueue!: MemoryFifo<Block>;
  private userFactory!: UserDataFactory;
  private userStateFactory!: UserStateFactory;
  private mutex = !isNode ? new Mutex('world-state-mutex') : undefined;
  private numCPU = !isNode ? navigator.hardwareConcurrency : os.cpus().length;
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
    private hashPathSource: HashPathSource | undefined,
    private ethSigner: EthereumSigner,
    private options: CoreSdkOptions,
    private escapeHatchMode: boolean,
  ) {
    super();
  }

  public async init() {
    if (this.sdkStatus.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Sdk is not UNINITIALIZED.');
    }

    this.updateInitState(SdkInitState.INITIALIZING);

    const barretenberg = await BarretenbergWasm.new();
    const noteAlgos = new NoteAlgorithms(barretenberg);
    const crsData = await this.getCrsData(
      this.escapeHatchMode ? EscapeHatchProver.circuitSize : JoinSplitProver.circuitSize,
    );
    const numWorkers = Math.min(this.numCPU || 1, 8);
    const workerPool = await WorkerPool.new(barretenberg, numWorkers);
    const pooledProverFactory = new PooledProverFactory(workerPool, crsData);
    const joinSplitProver = new JoinSplitProver(
      await pooledProverFactory.createUnrolledProver(JoinSplitProver.circuitSize),
    );
    const accountProver = new AccountProver(await pooledProverFactory.createUnrolledProver(AccountProver.circuitSize));
    const escapeHatchProver = new EscapeHatchProver(
      await pooledProverFactory.createProver(EscapeHatchProver.circuitSize),
    );

    this.blake2s = new Blake2s(barretenberg);
    this.pedersen = new Pedersen(barretenberg, workerPool.workers[0]);
    this.grumpkin = new Grumpkin(barretenberg);
    this.schnorr = new Schnorr(barretenberg);
    this.userFactory = new UserDataFactory(this.grumpkin);
    this.userStateFactory = new UserStateFactory(this.grumpkin, this.pedersen, noteAlgos, this.db, this.rollupProvider);
    this.workerPool = workerPool;
    this.worldState = new WorldState(this.leveldb, this.pedersen);

    await this.worldState.init();

    const {
      blockchainStatus: { chainId, rollupContractAddress, assets },
    } = await this.getRemoteStatus();
    await this.leveldb.put('rollupContractAddress', rollupContractAddress.toBuffer());

    // If chainId is 0 (falafel is using simulated blockchain) pretend it needs to be goerli.
    this.sdkStatus = {
      ...this.sdkStatus,
      chainId: chainId || 5,
      rollupContractAddress: rollupContractAddress,
      dataSize: this.worldState.getSize(),
      dataRoot: this.worldState.getRoot(),
      syncedToRollup: +(await this.leveldb.get('syncedToRollup').catch(() => -1)),
      latestRollupId: +(await this.leveldb.get('latestRollupId').catch(() => -1)),
      assets,
    };

    await this.initUserStates();

    if (!this.escapeHatchMode) {
      this.joinSplitProofCreator = new JoinSplitProofCreator(
        joinSplitProver,
        this.ethSigner,
        this.worldState,
        this.blake2s,
        this.grumpkin,
        this.pedersen,
        noteAlgos,
        this.db,
      );
      this.accountProofCreator = new AccountProofCreator(accountProver, this.worldState, this.pedersen);
      await this.createJoinSplitProvingKey(joinSplitProver);
      await this.createAccountProvingKey(accountProver);
    } else {
      this.joinSplitProofCreator = new EscapeHatchProofCreator(
        escapeHatchProver,
        this.ethSigner,
        this.worldState,
        this.blake2s,
        this.grumpkin,
        this.pedersen,
        noteAlgos,
        this.hashPathSource!,
        this.db,
      );
      await this.createEscapeHatchProvingKey(escapeHatchProver);
    }

    this.updateInitState(SdkInitState.INITIALIZED);
  }

  public async getRollupContractAddress() {
    const result: Buffer | undefined = await this.leveldb.get('rollupContractAddress').catch(() => undefined);
    return result ? new EthAddress(result) : undefined;
  }

  public isEscapeHatchMode() {
    return this.escapeHatchMode;
  }

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
    debug('initializing user states...');
    await this.stopSyncingUserStates();

    const users = await this.db.getUsers();
    this.userStates = users.map(u => this.userStateFactory.createUserState(u));
    await Promise.all(this.userStates.map(us => us.init()));

    this.emit(SdkEvent.UPDATED_USERS);

    this.userStates.forEach(us => this.startSyncingUserState(us));
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

  private async createJoinSplitProvingKey(joinSplitProver: JoinSplitProver) {
    const start = new Date().getTime();
    const provingKey = await this.db.getKey('join-split-proving-key');
    if (provingKey) {
      this.logInitMsgAndDebug('Loading join-split proving key...');
      await joinSplitProver.loadKey(provingKey);
    } else {
      this.logInitMsgAndDebug('Computing join-split proving key...');
      await joinSplitProver.computeKey();
      if (this.options.saveProvingKey) {
        this.logInitMsgAndDebug('Saving join-split proving key...');
        const newProvingKey = await joinSplitProver.getKey();
        await this.db.addKey('join-split-proving-key', newProvingKey);
      }
      debug(`complete: ${new Date().getTime() - start}ms`);
    }
  }

  private async createAccountProvingKey(accountProver: AccountProver) {
    const start = new Date().getTime();
    const provingKey = await this.db.getKey('account-proving-key');
    if (provingKey) {
      this.logInitMsgAndDebug('Loading account proving key...');
      await accountProver.loadKey(provingKey);
    } else {
      this.logInitMsgAndDebug('Computing account proving key...');
      await accountProver.computeKey();
      if (this.options.saveProvingKey) {
        this.logInitMsgAndDebug('Saving account proving key...');
        const newProvingKey = await accountProver.getKey();
        await this.db.addKey('account-proving-key', newProvingKey);
      }
      debug(`complete: ${new Date().getTime() - start}ms`);
    }
  }

  private async createEscapeHatchProvingKey(escapeProver: EscapeHatchProver) {
    const start = new Date().getTime();
    this.logInitMsgAndDebug('Computing escape hatch proving key...');
    await escapeProver.computeKey();
    debug(`complete: ${new Date().getTime() - start}ms`);
  }

  public async destroy() {
    await this.stopSyncingUserStates();
    await this.stopReceivingBlocks();
    await this.workerPool?.destroy();
    await this.leveldb.close();
    await this.db.close();
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

  public async getFee(assetId: AssetId) {
    const { minFees } = await this.getRemoteStatus();
    return minFees[assetId];
  }

  public async startReceivingBlocks() {
    if (this.processBlocksPromise) {
      return;
    }

    this.blockQueue = new MemoryFifo<Block>();
    this.rollupProvider.on('block', b => this.blockQueue.put(b));
    this.userStates.forEach(us => us.startSync());
    this.processBlocksPromise = this.processBlockQueue();

    await this.sync();

    const syncedToRollup = await this.leveldb.get('syncedToRollup').catch(() => -1);
    await this.rollupProvider.start(+syncedToRollup + 1);

    debug('started processing blocks.');
  }

  private async sync() {
    const syncedToRollup = +(await this.leveldb.get('syncedToRollup').catch(() => -1));
    const blocks = await this.rollupProvider.getBlocks(syncedToRollup + 1);
    if (!blocks.length) {
      return;
    }

    const rollups = blocks.map(b => RollupProofData.fromBuffer(b.rollupProofData));
    debug('synchronising data...');
    await this.worldState.processRollups(rollups);
    await this.processAliases(rollups);
    if (rollups.length) {
      await this.updateStatusRollupInfo(rollups[rollups.length - 1]);
    }
    debug('done.');

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
  }

  private async stopReceivingBlocks() {
    this.rollupProvider.stop();
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

      // We use a mutex to ensure only one tab will process a block at a time (to prevent merkle tree corruption).
      // This is only a safety mechanism for if two tabs are processing blocks at once. Correct behaviour would
      // be for only one tab to process the block, and to alert the others to sync.
      await this.mutex?.lock();
      await this.worldState.syncFromDb().catch(() => {});
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      await this.worldState.processRollup(rollup);
      await this.updateStatusRollupInfo(rollup);
      await this.mutex?.unlock();

      await this.processAliases([rollup]);

      // Forward the block on to each UserState for processing.
      this.userStates.forEach(us => us.processBlock(block));

      this.emit(CoreSdkEvent.UPDATED_WORLD_STATE, rollup.rollupId, this.sdkStatus.latestRollupId);
      this.emit(SdkEvent.UPDATED_WORLD_STATE, rollup.rollupId, this.sdkStatus.latestRollupId);
    }
  }

  private async processAliases(rollups: RollupProofData[]) {
    const aliases = rollups
      .map(r => r.innerProofData)
      .flat()
      .filter(ip => ip.proofId === 1)
      .map(ip => {
        const { publicInput, publicOutput, assetId } = ip;
        const { aliasHash, nonce } = AccountAliasId.fromBuffer(assetId);
        const address = new GrumpkinAddress(Buffer.concat([publicInput, publicOutput]));
        // debug(`setting alias: ${aliasHash} -> ${address} (${nonce}).`);
        return { aliasHash, address, latestNonce: nonce };
      });
    await this.db.setAliases(aliases);
  }

  /**
   * Called when another instance of the sdk has updated the world state db.
   */
  public async notifyWorldStateUpdated() {
    await this.worldState.syncFromDb();
    this.sdkStatus.dataRoot = this.worldState.getRoot();
    this.sdkStatus.dataSize = this.worldState.getSize();
    this.sdkStatus.syncedToRollup = +(await this.leveldb.get('syncedToRollup').catch(() => -1));
    this.sdkStatus.latestRollupId = +(await this.leveldb.get('latestRollupId').catch(() => -1));
    this.emit(SdkEvent.UPDATED_WORLD_STATE, this.sdkStatus.syncedToRollup, this.sdkStatus.latestRollupId);
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

  public async validateEscapeOpen() {
    const {
      blockchainStatus: { escapeOpen, numEscapeBlocksRemaining },
    } = await this.rollupProvider.getStatus();
    if (!escapeOpen) {
      throw new Error(`Escape hatch window closed. Opens in ${numEscapeBlocksRemaining} blocks`);
    }
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

  private computeAliasHash(alias: string) {
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
    inputOwner?: EthAddress,
    noteRecipient?: AccountId,
    outputOwner?: EthAddress,
  ) {
    if (this.escapeHatchMode) {
      await this.validateEscapeOpen();
    }

    const userState = this.getUserState(userId);

    this.emit(SdkEvent.LOG, 'Generating proof...');

    const proofOutput = await this.joinSplitProofCreator.createProof(
      userState,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      assetId,
      signer,
      noteRecipient,
      outputOwner,
      inputOwner,
    );

    await this.rollupProvider.sendProof(proofOutput);

    const txHash = new TxHash(proofOutput.txId);
    const tx: UserJoinSplitTx = {
      txHash,
      userId,
      assetId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      inputOwner,
      outputOwner,
      ownedByUser: true,
      settled: false,
      created: new Date(),
    };
    await userState.addJoinSplitTx(tx);

    return txHash;
  }

  public async createAccountTx(
    signer: Signer,
    alias: string,
    nonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
  ) {
    const aliasHash = this.computeAliasHash(alias);
    const accountId = nonce ? new AccountId(accountPublicKey, nonce) : undefined;
    const accountIndex = accountId ? await this.db.getUserSigningKeyIndex(accountId, signer.getPublicKey()) : undefined;

    return this.accountProofCreator.createAccountTx(
      signer,
      aliasHash,
      nonce,
      migrate,
      accountPublicKey,
      newAccountPublicKey,
      newSigningPubKey1,
      newSigningPubKey2,
      accountIndex,
    );
  }

  public async createAccountProof(
    userId: AccountId,
    signer: Signer,
    alias: string,
    nonce: number,
    migrate: boolean,
    newSigningPublicKey1?: GrumpkinAddress,
    newSigningPublicKey2?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    if (this.escapeHatchMode) {
      throw new Error('Account modifications not supported in escape hatch mode.');
    }

    const aliasHash = this.computeAliasHash(alias);
    const userState = this.getUserState(userId);
    const { publicKey, privateKey } = userState.getUser();

    const signerPublicKey = signer.getPublicKey();
    const accountId = nonce ? new AccountId(publicKey, nonce) : undefined;
    const accountIndex = accountId ? await this.db.getUserSigningKeyIndex(accountId, signerPublicKey) : undefined;
    const newAccountPublicKey = newAccountPrivateKey ? this.derivePublicKey(newAccountPrivateKey) : publicKey;
    const newNonce = nonce + +migrate;

    this.emit(SdkEvent.LOG, 'Generating proof...');

    const rawProofData = await this.accountProofCreator.createProof(
      signer,
      aliasHash,
      nonce,
      migrate,
      publicKey,
      newAccountPublicKey,
      newSigningPublicKey1,
      newSigningPublicKey2,
      accountIndex,
    );

    await this.rollupProvider.sendProof({ proofData: rawProofData, viewingKeys: [] });

    if (migrate) {
      const userData = await this.userFactory.createUser(newAccountPrivateKey || privateKey, newNonce, alias);
      await this.addUserFromUserData(userData);
    }

    const newUserId = new AccountId(newAccountPublicKey, newNonce);
    const newUserState = this.getUserState(newUserId);
    const proof = new ProofData(rawProofData);
    const txHash = new TxHash(proof.txId);
    const tx: UserAccountTx = {
      txHash,
      userId: newUserId,
      aliasHash,
      newSigningPubKey1: newSigningPublicKey1?.x(),
      newSigningPubKey2: newSigningPublicKey2?.x(),
      migrated: migrate,
      settled: false,
      created: new Date(),
    };
    await newUserState.addAccountTx(tx);

    return txHash;
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
      const accountTx = await this.db.getAccountTx(txHash);
      if (accountTx) {
        if (accountTx.settled) {
          break;
        }
      } else {
        const txs = await this.db.getJoinSplitTxsByTxHash(txHash);
        if (txs.every(tx => tx.settled === true)) {
          break;
        }
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

  public getUserData(userId: AccountId) {
    return this.getUserState(userId).getUser();
  }

  public getUsersData() {
    return this.userStates.map(us => us.getUser());
  }

  public derivePublicKey(privateKey: Buffer) {
    return this.userFactory.derivePublicKey(privateKey);
  }

  public async addUser(privateKey: Buffer, nonce?: number) {
    const publicKey = this.derivePublicKey(privateKey);
    const accountNonce = nonce !== undefined ? nonce : await this.getLatestUserNonce(publicKey);

    const user = await this.userFactory.createUser(privateKey, accountNonce);
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

  public getMaxSpendableValue(assetId: AssetId, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getMaxSpendableValue(assetId);
  }

  public async getJoinSplitTxs(userId: AccountId) {
    return this.db.getJoinSplitTxs(userId);
  }

  public async getAccountTxs(userId: AccountId) {
    return this.db.getAccountTxs(userId);
  }

  public async getNotes(userId: AccountId) {
    return this.db.getUserNotes(userId);
  }
}

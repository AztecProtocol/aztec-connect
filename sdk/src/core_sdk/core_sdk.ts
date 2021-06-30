import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { AccountProver, JoinSplitProver, PooledProverFactory, ProofData } from '@aztec/barretenberg/client_proofs';
import { Crs } from '@aztec/barretenberg/crs';
import { Blake2s, Pedersen, PooledPedersen, Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider, SettlementTime } from '@aztec/barretenberg/rollup_provider';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { WorldState } from '@aztec/barretenberg/world_state';
import createDebug from 'debug';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import Mutex from 'idb-mutex';
import { LevelUp } from 'levelup';
import os from 'os';
import { Database } from '../database';
import { AccountProofCreator } from '../proofs/account_proof_creator';
import { JoinSplitProofCreator } from '../proofs/join_split_proof_creator';
import { AccountProofOutput, DefiProofOutput, JoinSplitProofOutput, ProofOutput } from '../proofs/proof_output';
import { SdkEvent, SdkInitState, SdkStatus } from '../sdk';
import { SchnorrSigner, Signer } from '../signer';
import { AccountAliasId, AccountId, UserData, UserDataFactory } from '../user';
import { UserState, UserStateEvent, UserStateFactory } from '../user_state';
import { UserAccountTx, UserDefiTx, UserJoinSplitTx } from '../user_tx';

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
  private blockQueue!: MemoryFifo<Block>;
  private userFactory!: UserDataFactory;
  private userStateFactory!: UserStateFactory;
  private mutex = !isNode ? new Mutex('world-state-mutex') : undefined;
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

    const barretenberg = await BarretenbergWasm.new();
    const numWorkers = this.nextLowestPowerOf2(Math.min(this.numCPU, 8));
    this.workerPool = await WorkerPool.new(barretenberg, numWorkers);

    const noteAlgos = new NoteAlgorithms(barretenberg, this.workerPool.workers[0]);
    this.blake2s = new Blake2s(barretenberg);
    this.pedersen = new PooledPedersen(barretenberg, this.workerPool);
    this.grumpkin = new Grumpkin(barretenberg);
    this.schnorr = new Schnorr(barretenberg);
    this.userFactory = new UserDataFactory(this.grumpkin);
    this.userStateFactory = new UserStateFactory(this.grumpkin, this.pedersen, noteAlgos, this.db, this.rollupProvider);
    this.worldState = new WorldState(this.leveldb, this.pedersen);

    await this.initUserStates();

    await this.worldState.init();

    const {
      blockchainStatus: { chainId, rollupContractAddress, assets },
    } = await this.getRemoteStatus();
    await this.leveldb.put('rollupContractAddress', rollupContractAddress.toBuffer());

    this.sdkStatus = {
      ...this.sdkStatus,
      chainId,
      rollupContractAddress: rollupContractAddress,
      dataSize: this.worldState.getSize(),
      dataRoot: this.worldState.getRoot(),
      syncedToRollup: +(await this.leveldb.get('syncedToRollup').catch(() => -1)),
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
      this.worldState,
      this.grumpkin,
      this.pedersen,
      noteAlgos,
      this.db,
    );
    const accountProver = new AccountProver(await pooledProverFactory.createUnrolledProver(AccountProver.circuitSize));
    this.accountProofCreator = new AccountProofCreator(accountProver, this.worldState, this.pedersen);
    await this.createJoinSplitProvingKey(joinSplitProver);
    await this.createAccountProvingKey(accountProver);

    this.updateInitState(SdkInitState.INITIALIZED);
  }

  public async getRollupContractAddress() {
    const result: Buffer | undefined = await this.leveldb.get('rollupContractAddress').catch(() => undefined);
    return result ? new EthAddress(result) : undefined;
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

  public async getFee(assetId: AssetId, transactionType: TxType, speed: SettlementTime) {
    const { txFees } = await this.getRemoteStatus();
    return txFees[assetId].feeConstants[transactionType] + txFees[assetId].baseFeeQuotes[speed].fee;
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

      // We use a mutex to ensure only one tab will process a block at a time (to prevent merkle tree corruption).
      // This is only a safety mechanism for if two tabs are processing blocks at once. Correct behaviour would
      // be for only one tab to process the block, and to alert the others to sync.
      await this.mutex?.lock();
      await this.worldState.syncFromDb().catch(() => {});
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      await this.worldState.processRollup(rollup);
      await this.processAliases([rollup]);
      await this.updateStatusRollupInfo(rollup);
      await this.mutex?.unlock();

      // Forward the block on to each UserState for processing.
      this.userStates.forEach(us => us.processBlock(block));
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
    inputOwner?: EthAddress,
    outputOwner?: EthAddress,
  ) {
    const userState = this.getUserState(userId);

    const { txId, proofData, viewingKeys, depositSigningData } = await this.joinSplitProofCreator.createProof(
      userState,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      BigInt(0),
      assetId,
      signer,
      noteRecipient,
      inputOwner,
      outputOwner,
    );

    const txHash = new TxHash(txId);
    const tx = new UserJoinSplitTx(
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
      true,
      new Date(),
    );

    return new JoinSplitProofOutput(tx, proofData, viewingKeys, publicInput ? depositSigningData : undefined);
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
    aliasHash: AliasHash,
    nonce: number,
    migrate: boolean,
    newSigningPublicKey1?: GrumpkinAddress,
    newSigningPublicKey2?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    const userState = this.getUserState(userId);
    const { publicKey } = userState.getUser();

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

    const { txId } = new ProofData(rawProofData);
    const txHash = new TxHash(txId);
    const tx = new UserAccountTx(
      txHash,
      new AccountId(newAccountPublicKey, newNonce),
      aliasHash,
      newSigningPublicKey1?.x(),
      newSigningPublicKey2?.x(),
      migrate,
      new Date(),
    );

    return new AccountProofOutput(tx, rawProofData);
  }

  public async createDefiProof(
    bridgeId: BridgeId,
    userId: AccountId,
    depositValue: bigint,
    txFee: bigint,
    signer: Signer,
  ) {
    const userState = this.getUserState(userId);
    const { txId, proofData, viewingKeys } = await this.joinSplitProofCreator.createProof(
      userState,
      BigInt(0),
      BigInt(0),
      depositValue + txFee,
      BigInt(0),
      BigInt(0),
      depositValue,
      bridgeId.inputAssetId,
      signer,
      undefined,
      undefined,
      undefined,
      bridgeId,
    );

    const txHash = new TxHash(txId);
    const tx = new UserDefiTx(txHash, userId, bridgeId, depositValue, txFee, new Date());

    return new DefiProofOutput(tx, proofData, viewingKeys);
  }

  public async sendProof(proofOutput: ProofOutput, depositSignature?: Buffer) {
    const { tx } = proofOutput;
    const { userId } = tx;
    const userState = this.getUserState(userId);

    const { proofData, viewingKeys } = proofOutput;
    await this.rollupProvider.sendProof({ proofData, viewingKeys, depositSignature });

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
    const accountNonce = nonce !== undefined ? nonce : await this.getLatestUserNonce(publicKey);

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

  public getMaxSpendableValue(assetId: AssetId, userId: AccountId) {
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

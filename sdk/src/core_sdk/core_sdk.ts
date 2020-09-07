import { BlockSource, Block } from 'barretenberg/block_source';
import { JoinSplitProver, JoinSplitProof, computeAliasNullifier } from 'barretenberg/client_proofs/join_split_proof';
import { Crs } from 'barretenberg/crs';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { PooledProverFactory } from 'barretenberg/client_proofs/prover';
import { MemoryFifo } from 'barretenberg/fifo';
import { RollupProvider, RollupProviderExplorer } from 'barretenberg/rollup_provider';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { Database } from '../database';
import { JoinSplitProofCreator } from '../join_split_proof';
import { TxsState } from '../txs_state';
import { UserDataFactory, KeyPair } from '../user';
import { UserState, UserStateFactory, UserStateEvent } from '../user_state';
import { Sdk, SdkEvent, SdkInitState, TxHash, AssetId, SdkStatus, Action, ActionState } from '../sdk';
import { UserTx, UserTxAction } from '../user_tx';
import Mutex from 'idb-mutex';
import { EthereumProvider } from '../ethereum_provider';
import { EthAddress, GrumpkinAddress, Address } from 'barretenberg/address';
import { TokenContract, Web3TokenContract } from '../token_contract';
import { Web3Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';
import { CoreSdkUser } from './core_sdk_user';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { MockTokenContract } from '../token_contract/mock_token_contract';
import { AccountProofCreator } from '../account_proof_creator';
import { AccountProver } from 'barretenberg/client_proofs/account_proof';
import { WorkerPool } from 'barretenberg/wasm/worker_pool';

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
  // The instance must restart.
  CLEAR_DATA = 'CORESDKEVENT_RESTART',
}

export interface CoreSdkOptions {
  saveProvingKey?: boolean;
}

export class CoreSdk extends EventEmitter implements Sdk {
  private ethersProvider: Web3Provider;
  private worldState!: WorldState;
  private userStates: UserState[] = [];
  private tokenContracts: TokenContract[] = [];
  private workerPool!: WorkerPool;
  private joinSplitProofCreator!: JoinSplitProofCreator;
  private accountProofCreator!: AccountProofCreator;
  private blockQueue!: MemoryFifo<Block>;
  private userFactory!: UserDataFactory;
  private userStateFactory!: UserStateFactory;
  private txsState!: TxsState;
  private mutex = new Mutex('world-state-mutex');
  private sdkStatus: SdkStatus = {
    chainId: -1,
    rollupContractAddress: EthAddress.ZERO,
    syncedToRollup: -1,
    latestRollupId: -1,
    initState: SdkInitState.UNINITIALIZED,
    dataRoot: Buffer.alloc(0),
    dataSize: 0,
  };
  private actionState?: ActionState;
  private processBlocksPromise?: Promise<void>;
  private blake2s!: Blake2s;

  constructor(
    ethereumProvider: EthereumProvider,
    private leveldb: LevelUp,
    private db: Database,
    private rollupProvider: RollupProvider,
    private rollupProviderExplorer: RollupProviderExplorer,
    private blockSource: BlockSource,
    private options: CoreSdkOptions,
  ) {
    super();
    this.ethersProvider = new Web3Provider(ethereumProvider);
  }

  public async init() {
    if (this.sdkStatus.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Sdk is not UNINITIALIZED.');
    }

    this.updateInitState(SdkInitState.INITIALIZING);

    const { chainId, networkOrHost, rollupContractAddress, tokenContractAddress } = await this.getRemoteStatus();

    const { chainId: ethProviderChainId } = await this.ethersProvider.getNetwork();
    if (chainId !== ethProviderChainId) {
      throw new Error(
        `Ethereum provider chainId ${ethProviderChainId} does not match rollup provider chainId ${chainId}.`,
      );
    }

    this.tokenContracts[AssetId.DAI] =
      networkOrHost !== 'development'
        ? new Web3TokenContract(this.ethersProvider, tokenContractAddress, rollupContractAddress, chainId)
        : new MockTokenContract();
    await Promise.all(this.tokenContracts.map(tc => tc.init()));

    const barretenberg = await BarretenbergWasm.new();
    const pedersen = new Pedersen(barretenberg);
    const blake2s = new Blake2s(barretenberg);
    const grumpkin = new Grumpkin(barretenberg);
    const crsData = await this.getCrsData(128 * 1024);
    const numWorkers = Math.min(navigator.hardwareConcurrency || 1, 8);
    const workerPool = await WorkerPool.new(barretenberg, numWorkers);
    const pooledProverFactory = new PooledProverFactory(workerPool, crsData);
    const joinSplitProver = new JoinSplitProver(barretenberg, await pooledProverFactory.createProver(128 * 1024));
    const accountProver = new AccountProver(await pooledProverFactory.createProver(64 * 1024));

    this.blake2s = blake2s;
    this.userFactory = new UserDataFactory(grumpkin, this.ethersProvider);
    this.userStateFactory = new UserStateFactory(grumpkin, blake2s, this.db, this.blockSource);
    this.workerPool = workerPool;
    this.txsState = new TxsState(this.rollupProviderExplorer);
    this.worldState = new WorldState(this.leveldb, pedersen, blake2s);
    this.joinSplitProofCreator = new JoinSplitProofCreator(joinSplitProver, this.worldState, grumpkin);
    this.accountProofCreator = new AccountProofCreator(accountProver, this.worldState, blake2s);

    await this.worldState.init();

    // If chainId is 0 (falafel is using simulated blockchain) pretend it needs to be ropsten.
    this.sdkStatus.chainId = chainId || 3;
    this.sdkStatus.rollupContractAddress = rollupContractAddress;
    this.sdkStatus.dataSize = this.worldState.getSize();
    this.sdkStatus.dataRoot = this.worldState.getRoot();
    this.sdkStatus.syncedToRollup = +(await this.leveldb.get('syncedToRollup').catch(() => -1));
    this.sdkStatus.latestRollupId = +(await this.leveldb.get('latestRollupId').catch(() => -1));

    await this.initUserStates();
    await this.createJoinSplitProvingKey(joinSplitProver);
    await this.createAccountProvingKey(accountProver);

    this.updateInitState(SdkInitState.INITIALIZED);
  }

  private async getCrsData(circuitSize: number) {
    let crsData = await this.db.getKey(`crs-${circuitSize}`);
    if (!crsData) {
      this.logInitMsgAndDebug('Downloading CRS data...');
      const crs = new Crs(circuitSize);
      await crs.download();
      crsData = crs.getData();
      await this.db.addKey(`crs-${circuitSize}`, Buffer.from(crsData));
      debug('done.');
    }
    return crsData;
  }

  /**
   * Shutdown any existing `UserState` instances and wait for them to complete any processing.
   * Load the users from the database and create and initialize their new user states.
   * Emit SdkEvent.UPDATED_USERS to update the UI containing and user lists.
   * Emit SdkEvent.UPDATED_USER_STATE to update the UI for each user.
   * Register for changes to each user state an emit appropriate events.
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
    this.emit(SdkEvent.UPDATED_USER_STATE, userState.getUser().ethAddress);

    userState.on(
      UserStateEvent.UPDATED_USER_STATE,
      (ethAddress: EthAddress, balanceAfter: bigint, diff: bigint, assetId: AssetId) => {
        this.emit(CoreSdkEvent.UPDATED_USER_STATE, ethAddress, balanceAfter, diff, assetId);
        this.emit(SdkEvent.UPDATED_USER_STATE, ethAddress, balanceAfter, diff, assetId);
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
    await this.workerPool?.destroy();
    await this.stopReceivingBlocks();
    this.stopTrackingGlobalState();
    this.updateInitState(SdkInitState.DESTROYED);
    this.removeAllListeners();
  }

  private updateInitState(initState: SdkInitState, msg?: string) {
    this.sdkStatus.initState = initState;
    this.emit(SdkEvent.UPDATED_INIT_STATE, initState, msg);
  }

  public async clearData() {
    if (this.processBlocksPromise) {
      await this.notifiedClearData();
    } else {
      // Emit event requesting the primary instance clears the data.
      this.emit(CoreSdkEvent.CLEAR_DATA);
    }
  }

  public async notifiedClearData() {
    if (!this.processBlocksPromise) {
      return;
    }
    await this.stopSyncingUserStates();
    await this.stopReceivingBlocks();
    await this.leveldb.clear();
    await this.db.resetUsers();

    await this.worldState.init();
    await this.notifyWorldStateUpdated();
    await this.initUserStates();
    await this.startReceivingBlocks();
  }

  public getLocalStatus() {
    return this.sdkStatus;
  }

  private logInitMsgAndDebug(msg: string) {
    this.updateInitState(SdkInitState.INITIALIZING, msg);
    debug(msg.toLowerCase());
  }

  public async getRemoteStatus() {
    return await this.rollupProvider.status();
  }

  public getTokenContract(assetId: AssetId) {
    return this.tokenContracts[assetId];
  }

  public async startReceivingBlocks() {
    if (this.processBlocksPromise) {
      return;
    }

    this.blockQueue = new MemoryFifo<Block>();
    this.blockSource.on('block', b => this.blockQueue.put(b));
    this.processBlocksPromise = this.processBlockQueue();

    const syncedToBlock = await this.leveldb.get('syncedToBlock').catch(() => -1);
    await this.blockSource.start(+syncedToBlock + 1);
    this.sdkStatus.latestRollupId = this.blockSource.getLatestRollupId();

    this.userStates.forEach(us => us.startSync());

    debug('started processing blocks.');
  }

  private async stopReceivingBlocks() {
    this.blockSource.stop();
    this.blockSource.removeAllListeners();
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
      await this.mutex.lock();
      await this.worldState.syncFromDb().catch(() => {});
      await this.worldState.processBlock(block);

      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const rollupId = rollup.rollupId;
      const latestRollupId = this.blockSource.getLatestRollupId();
      await this.leveldb.put('syncedToRollup', rollupId.toString());
      await this.leveldb.put('latestRollupId', latestRollupId.toString());
      await this.leveldb.put('syncedToBlock', block.blockNum.toString());

      this.sdkStatus.syncedToRollup = rollupId;
      this.sdkStatus.latestRollupId = latestRollupId;
      this.sdkStatus.dataRoot = this.worldState.getRoot();
      this.sdkStatus.dataSize = this.worldState.getSize();
      await this.mutex.unlock();

      // Forward the block on to each UserState for processing.
      this.userStates.forEach(us => us.processBlock(block));

      await this.processAliases(rollup);

      this.emit(CoreSdkEvent.UPDATED_WORLD_STATE, rollupId, this.sdkStatus.latestRollupId);
      this.emit(SdkEvent.UPDATED_WORLD_STATE, rollupId, this.sdkStatus.latestRollupId);
    }
  }

  private async processAliases(rollup: RollupProofData) {
    for (const { proofId, publicInput, publicOutput, nullifier1 } of rollup.innerProofData) {
      if (proofId !== 1) {
        continue;
      }
      const publicKey = new GrumpkinAddress(Buffer.concat([publicInput, publicOutput]));
      debug(`adding alias: ${nullifier1.toString('hex')} -> ${publicKey.toString()}.`);
      this.db.addAlias(nullifier1, publicKey);
    }
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
  public async notifyUserStateUpdated(ethAddress: EthAddress) {
    await this.getUserState(ethAddress)?.init();
    this.emit(SdkEvent.UPDATED_USER_STATE, ethAddress);
  }

  private async createProof(
    assetId: AssetId,
    proofSender: EthAddress,
    action: UserTxAction,
    value: bigint,
    noteRecipient?: GrumpkinAddress,
    outputOwner?: EthAddress,
    signer?: Signer,
  ) {
    if (!noteRecipient && !outputOwner) {
      throw new Error('Must provide either a note recipient or an output eth address.');
    }

    const created = Date.now();
    const user = await this.db.getUser(proofSender);
    if (!user) {
      throw new Error(`Unknown user: ${proofSender}`);
    }
    const userState = this.getUserState(proofSender)!;
    const publicInput = ['DEPOSIT', 'PUBLIC_TRANSFER'].includes(action) ? value : BigInt(0);
    const publicOutput = ['WITHDRAW', 'PUBLIC_TRANSFER'].includes(action) ? value : BigInt(0);
    const newNoteValue = ['DEPOSIT', 'TRANSFER'].includes(action) ? value : BigInt(0);

    const proofOutput = await this.joinSplitProofCreator.createProof(
      userState,
      publicInput,
      publicOutput,
      newNoteValue,
      user,
      noteRecipient,
      outputOwner,
      signer,
    );

    await this.rollupProvider.sendProof(proofOutput);

    const proofData = new JoinSplitProof(proofOutput.proofData, proofOutput.viewingKeys);
    const txHash = proofData.getTxId();
    const userTx: UserTx = {
      action,
      txHash,
      ethAddress: user.ethAddress,
      value,
      recipient: noteRecipient ? noteRecipient.toBuffer() : outputOwner!.toBuffer(),
      settled: false,
      created: new Date(created),
    };
    await this.db.addUserTx(userTx);
    this.emit(CoreSdkEvent.UPDATED_USER_STATE, userTx.ethAddress);
    this.emit(SdkEvent.UPDATED_USER_STATE, userTx.ethAddress);
    return txHash;
  }

  public async getAddressFromAlias(alias: string) {
    const aliasHash = computeAliasNullifier(alias, this.blake2s);
    return await this.db.getAliasAddress(aliasHash);
  }

  public async approve(assetId: AssetId, value: bigint, from: EthAddress) {
    const action = () => this.getTokenContract(assetId).approve(from, value);
    const txHash = await this.performAction(Action.APPROVE, value, from, this.sdkStatus.rollupContractAddress, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, from);
    return txHash;
  }

  public async mint(assetId: AssetId, value: bigint, to: EthAddress) {
    const action = () => this.getTokenContract(assetId).mint(to, value);
    const txHash = await this.performAction(Action.MINT, value, this.sdkStatus.rollupContractAddress, to, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, to);
    return txHash;
  }

  public async deposit(assetId: AssetId, value: bigint, from: EthAddress, to: GrumpkinAddress) {
    const signer = this.ethersProvider.getSigner(from.toString());
    const validation = () => this.checkPublicBalanceAndAllowance(assetId, value, from);
    const action = () => this.createProof(assetId, from, 'DEPOSIT', value, to, undefined, signer);
    return this.performAction(Action.DEPOSIT, value, from, to, action, validation);
  }

  public async withdraw(assetId: AssetId, value: bigint, from: EthAddress, to: EthAddress) {
    const action = () => this.createProof(assetId, from, 'WITHDRAW', value, undefined, to);
    return this.performAction(Action.WITHDRAW, value, from, to, action);
  }

  public async transfer(assetId: AssetId, value: bigint, from: EthAddress, to: GrumpkinAddress) {
    const action = () => this.createProof(assetId, from, 'TRANSFER', value, to);
    return this.performAction(Action.TRANSFER, value, from, to, action);
  }

  public async publicTransfer(assetId: AssetId, value: bigint, from: EthAddress, to: EthAddress) {
    const signer = this.ethersProvider.getSigner(from.toString());
    const validation = () => this.checkPublicBalanceAndAllowance(assetId, value, from);
    const action = () => this.createProof(assetId, from, 'PUBLIC_TRANSFER', value, undefined, to, signer);
    return this.performAction(Action.PUBLIC_TRANSFER, value, from, to, action, validation);
  }

  private async checkPublicBalanceAndAllowance(assetId: AssetId, value: bigint, from: EthAddress) {
    const tokenContract = this.getTokenContract(assetId);
    const tokenBalance = await tokenContract.balanceOf(from);
    if (tokenBalance < value) {
      throw new Error(`Insufficient public token balance: ${tokenContract.fromErc20Units(tokenBalance)}`);
    }
    const allowance = await tokenContract.allowance(from);
    if (allowance < value) {
      throw new Error(`Insufficient allowance: ${tokenContract.fromErc20Units(allowance)}`);
    }
  }

  private async performAction(
    action: Action,
    value: bigint,
    sender: EthAddress,
    recipient: Address,
    fn: () => Promise<Buffer>,
    validation = async () => {},
  ) {
    this.actionState = {
      action,
      value,
      sender,
      recipient,
      created: new Date(),
    };
    this.emit(SdkEvent.UPDATED_ACTION_STATE, { ...this.actionState });
    try {
      await validation();
      this.actionState.txHash = await fn();
    } catch (err) {
      this.actionState.error = err;
      throw err;
    } finally {
      this.emit(SdkEvent.UPDATED_ACTION_STATE, { ...this.actionState });
    }
    return this.actionState.txHash;
  }

  public isBusy() {
    return this.actionState ? !this.actionState.txHash && !this.actionState.error : false;
  }

  public newKeyPair(): KeyPair {
    return this.userFactory.newKeyPair();
  }

  public async createAccount(ethAddress: EthAddress, alias: string, newSigningPublicKey?: GrumpkinAddress) {
    const action = async () => {
      const userState = this.getUserState(ethAddress);
      if (!userState) {
        throw new Error(`Unknown user: ${ethAddress}`);
      }
      const { publicKey } = userState.getUser();

      const rawProofData = await this.accountProofCreator.createProof(
        userState,
        newSigningPublicKey,
        undefined,
        newSigningPublicKey ? publicKey : undefined,
        alias,
      );

      await this.rollupProvider.sendProof({ proofData: rawProofData, viewingKeys: [] });

      // It *looks* like a join split...
      const proofData = new JoinSplitProof(rawProofData, []);
      const txHash = proofData.getTxId();

      const userTx: UserTx = {
        action: 'ACCOUNT',
        txHash,
        ethAddress,
        value: BigInt(0),
        recipient: ethAddress.toBuffer(),
        settled: false,
        created: new Date(),
      };
      await this.db.addUserTx(userTx);

      this.emit(CoreSdkEvent.UPDATED_USER_STATE, userTx.ethAddress);
      this.emit(SdkEvent.UPDATED_USER_STATE, userTx.ethAddress);

      return txHash;
    };

    return this.performAction(Action.ACCOUNT, BigInt(0), ethAddress, ethAddress, action);
  }

  private async isSynchronised() {
    const providerStatus = await this.rollupProvider.status();
    const localDataRoot = await this.worldState.getRoot();
    return localDataRoot.equals(providerStatus.dataRoot);
  }

  public async awaitSynchronised() {
    while (!(await this.isSynchronised())) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async awaitSettlement(address: EthAddress, txHash: TxHash, timeout = 120) {
    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting tx settlement: ${txHash.toString('hex')}`);
      }
      const tx = await this.db.getUserTx(address, txHash);
      if (tx?.settled === true) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public getUserState(ethAddress: EthAddress) {
    return this.userStates.find(us => us.getUser().ethAddress.equals(ethAddress));
  }

  public getUserData(ethAddress: EthAddress) {
    return this.getUserState(ethAddress)?.getUser();
  }

  public getUsersData() {
    return this.userStates.map(us => us.getUser());
  }

  public async addUser(ethAddress: EthAddress) {
    if (await this.db.getUser(ethAddress)) {
      throw new Error(`User already exists: ${ethAddress}`);
    }
    const user = await this.userFactory.createUser(ethAddress);
    await this.db.addUser(user);

    const userState = this.userStateFactory.createUserState(user);
    await userState.init();
    this.userStates.push(userState);

    this.emit(CoreSdkEvent.UPDATED_USERS);
    this.emit(SdkEvent.UPDATED_USERS);

    this.startSyncingUserState(userState);

    return new CoreSdkUser(ethAddress, this);
  }

  public async removeUser(ethAddress: EthAddress) {
    const userState = this.getUserState(ethAddress);
    if (!userState) {
      throw new Error(`User does not exist: ${ethAddress}`);
    }

    this.userStates = this.userStates.filter(us => us !== userState);
    userState.stopSync();
    await this.db.removeUser(ethAddress);

    this.emit(CoreSdkEvent.UPDATED_USERS);
    this.emit(SdkEvent.UPDATED_USERS);
  }

  public getUser(address: EthAddress) {
    if (!this.getUserData(address)) {
      return;
    }
    return new CoreSdkUser(address, this);
  }

  public getBalance(ethAddress: EthAddress) {
    const userState = this.getUserState(ethAddress);
    if (!userState) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return userState.getBalance();
  }

  public async getLatestRollups() {
    return this.txsState.getLatestRollups();
  }

  public async getLatestTxs() {
    return this.txsState.getLatestTxs();
  }

  public async getRollup(rollupId: number) {
    return await this.txsState.getRollup(rollupId);
  }

  public async getTx(txHash: Buffer) {
    return await this.txsState.getTx(txHash);
  }

  public async getUserTxs(ethAddress: EthAddress) {
    return this.db.getUserTxs(ethAddress);
  }

  public getActionState() {
    return this.actionState;
  }

  public startTrackingGlobalState() {
    this.txsState.on('rollups', rollups => this.emit(SdkEvent.UPDATED_EXPLORER_ROLLUPS, rollups));
    this.txsState.on('txs', txs => this.emit(SdkEvent.UPDATED_EXPLORER_TXS, txs));
    this.txsState.start();
  }

  public stopTrackingGlobalState() {
    this.txsState?.removeAllListeners();
    this.txsState?.stop();
  }
}

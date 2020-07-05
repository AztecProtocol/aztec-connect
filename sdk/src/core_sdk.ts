import { BlockSource, Block } from 'barretenberg/block_source';
import { JoinSplitProver } from 'barretenberg/client_proofs/join_split_proof';
import { Crs } from 'barretenberg/crs';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { MemoryFifo } from 'barretenberg/fifo';
import { PooledProver } from 'barretenberg/client_proofs/prover/pooled_prover';
import { RollupProvider, RollupProviderExplorer } from 'barretenberg/rollup_provider';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { DbUser, UserTxAction, Database } from './database';
import { JoinSplitProofCreator } from './join_split_proof';
import { TxsState } from './txs_state';
import { User, UserFactory } from './user';
import { UserState, UserStateFactory } from './user_state';
import { Sdk, SdkEvent, SdkInitState, TxHash } from './sdk';
import { UserTx } from './user_tx';
import Mutex from 'idb-mutex';

const debug = createDebug('bb:core_sdk');

function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    privateKey: dbUser.privateKey ? Buffer.from(dbUser.privateKey) : undefined,
    publicKey: Buffer.from(dbUser.publicKey),
    alias: dbUser.alias,
  };
}

/**
 * These are events that are only emitted due to changes triggered within the current execution context.
 * i.e. Do not emit these events, if responding to an external trigger to refresh our internal state.
 * Primarily, these are hooked into a broadcast channel to notify other instances of state changes.
 */
export enum CoreSdkEvent {
  // A user is added.
  UPDATED_USERS = 'CORESDKEVENT_UPDATED_USERS',
  // A transaction has been created.
  NEW_USER_TX = 'CORESDKEVENT_NEW_USER_TX',
  // A block has been processed.
  BLOCK_PROCESSED = 'CORESDKEVENT_BLOCK_PROCESSED',
  // The instance must restart.
  RESTART = 'CORESDKEVENT_RESTART',
}

export interface CoreSdkOptions {
  saveProvingKey?: boolean;
}

export class CoreSdk extends EventEmitter implements Sdk {
  private initState = SdkInitState.UNINITIALIZED;
  private user!: User;
  private worldState!: WorldState;
  private users: User[] = [];
  private userStates: UserState[] = [];
  private pooledProver!: PooledProver;
  private joinSplitProofCreator!: JoinSplitProofCreator;
  private blockQueue!: MemoryFifo<Block>;
  private userFactory!: UserFactory;
  private userStateFactory!: UserStateFactory;
  private txsState!: TxsState;
  private mutex = new Mutex('world-state-mutex');

  constructor(
    private leveldb: LevelUp,
    private db: Database,
    private rollupProvider: RollupProvider,
    private rollupProviderExplorer: RollupProviderExplorer,
    private blockSource: BlockSource,
    private options: CoreSdkOptions,
  ) {
    super();
  }

  public async init() {
    if (this.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Sdk is not UNINITIALIZED.');
    }

    this.emit(SdkEvent.UPDATED_INIT_STATE, (this.initState = SdkInitState.INITIALIZING));

    const barretenberg = await BarretenbergWasm.new();
    const pedersen = new Pedersen(barretenberg);
    const blake2s = new Blake2s(barretenberg);
    const grumpkin = new Grumpkin(barretenberg);
    const circuitSize = 128 * 1024;
    const crsData = await this.getCrsData(circuitSize);
    const numWorkers = Math.min(navigator.hardwareConcurrency || 1, 8);
    const pooledProver = await PooledProver.new(barretenberg, crsData, circuitSize, numWorkers);
    const joinSplitProver = new JoinSplitProver(barretenberg, pooledProver);

    this.userFactory = new UserFactory(grumpkin);
    this.userStateFactory = new UserStateFactory(grumpkin, blake2s, this.db);
    this.pooledProver = pooledProver;
    this.txsState = new TxsState(this.rollupProviderExplorer);
    this.worldState = new WorldState(this.leveldb, pedersen, blake2s);
    this.joinSplitProofCreator = new JoinSplitProofCreator(joinSplitProver, this.worldState, grumpkin);

    await this.worldState.init();
    await this.initUsers();
    this.switchToUser(0);
    await this.createProvingKey(joinSplitProver);

    this.blockQueue = new MemoryFifo<Block>();
    this.blockSource.on('block', b => this.blockQueue.put(b));
    this.processBlockQueue();

    this.emit(SdkEvent.UPDATED_INIT_STATE, (this.initState = SdkInitState.INITIALIZED));
  }

  private async getCrsData(circuitSize: number) {
    let crsData = await this.db.getKey(`crs-${circuitSize}`);
    if (!crsData) {
      debug('downloading crs data...');
      const crs = new Crs(circuitSize);
      await crs.download();
      crsData = crs.getData();
      await this.db.addKey(`crs-${circuitSize}`, Buffer.from(crsData));
      debug('done.');
    }
    return crsData;
  }

  /**
   * Load the users from the database and initialize their corresponding user states.
   * Public so it can be called when externally notified of new users.
   */
  public async initUsers() {
    this.users = (await this.db.getUsers()).map(dbUserToUser);
    if (!this.users.length) {
      const user = this.userFactory.createUser(0);
      this.db.addUser(user);
      this.users = [user];
      debug(`created new user ${user.id}.`);
    }
    this.userStates = this.users.filter(u => u.privateKey).map(u => this.userStateFactory.createUserState(u));
    await Promise.all(this.userStates.map(us => us.init()));
    this.user = this.users[0];
    this.emit(SdkEvent.UPDATED_USERS, this.users);
  }

  private async createProvingKey(joinSplitProver: JoinSplitProver) {
    const start = new Date().getTime();
    const provingKey = await this.db.getKey('join-split-proving-key');
    if (provingKey) {
      await joinSplitProver.loadKey(provingKey);
    } else {
      this.logAndDebug('computing proving key...');
      await joinSplitProver.computeKey();
      if (this.options.saveProvingKey) {
        debug('saving...');
        const newProvingKey = await joinSplitProver.getKey();
        await this.db.addKey('join-split-proving-key', newProvingKey);
      }
      this.logAndDebug(`complete: ${new Date().getTime() - start}ms`);
    }
  }

  private async deinit() {
    await this.pooledProver.destroy();
    this.blockSource.stop();
    this.blockSource.removeAllListeners();
    this.blockQueue.cancel();
    this.stopTrackingGlobalState();
    this.emit(SdkEvent.UPDATED_INIT_STATE, (this.initState = SdkInitState.UNINITIALIZED));
  }

  public async restart() {
    await this.deinit();
    await this.init();
  }

  public async destroy() {
    await this.deinit();
    this.emit(SdkEvent.UPDATED_INIT_STATE, (this.initState = SdkInitState.DESTROYED));
  }

  public async clearData() {
    await this.destroy();
    await this.leveldb.clear();
    await this.db.clearNote();
    await this.db.clearUserTxState();
    await this.init();
    this.emit(CoreSdkEvent.RESTART);
  }

  public getInitState() {
    return this.initState;
  }

  public getDataRoot() {
    return this.worldState.getRoot();
  }

  public getDataSize() {
    return this.worldState.getSize();
  }

  private logAndDebug(str: string) {
    debug(str);
    this.emit(SdkEvent.LOG, str);
  }

  public async getStatus() {
    return await this.rollupProvider.status();
  }

  public async startReceivingBlocks() {
    debug('started processing blocks.');
    const fromBlock = await this.leveldb.get('syncedToBlock').catch(() => {});
    this.blockSource.start(fromBlock ? +fromBlock + 1 : 0);
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
      const dataSize = this.worldState.getSize();
      if (dataSize === block.dataStartIndex) {
        await this.worldState.processBlock(block);
      } else {
        debug(`skipping block ${block.rollupId}, dataSize != dataStartIndex: ${dataSize} != ${block.dataStartIndex}.`);
      }
      await this.mutex.unlock();
      await this.handleBlock(block);
      await this.leveldb.put('syncedToBlock', block.blockNum.toString());
      this.emit(CoreSdkEvent.BLOCK_PROCESSED, block);
    }
  }

  public async handleBlockEvent(block: Block) {
    await this.worldState.syncFromDb();
    this.handleBlock(block);
  }

  private async handleBlock(block: Block) {
    await Promise.all(
      this.userStates.map(async userState => {
        const userId = userState.getUser().id;
        const balanceBefore = userState.getBalance();

        if (!(await userState.processBlock(block))) {
          return;
        }

        if (userId === this.user.id) {
          const balanceAfter = userState.getBalance();
          const diff = balanceAfter - balanceBefore;
          if (diff !== 0) {
            this.emit(SdkEvent.UPDATED_BALANCE, balanceAfter);
            this.emit(SdkEvent.LOG, `balance updated: ${this.getBalance()} (${diff >= 0 ? '+' : ''}${diff})`);
          }
        }

        this.emit(SdkEvent.UPDATED_USER_TX, userId);
      }),
    );
  }

  private async createProof(action: UserTxAction, value: number, recipient: Buffer, publicAddress?: Buffer) {
    const created = Date.now();
    const user = this.getUser();
    const userState = this.getUserState(user.id)!;
    const input = { userId: user.id, value, recipient, created: new Date(created) };
    const deposit = action === 'DEPOSIT' ? value : 0;
    const withdraw = action === 'WITHDRAW' ? value : 0;
    const transfer = action === 'TRANSFER' ? value : 0;

    const proofOutput = await this.joinSplitProofCreator.createProof(
      userState,
      deposit,
      withdraw,
      transfer,
      user,
      recipient,
      publicAddress,
    );
    const { txHash } = await this.rollupProvider.sendProof(proofOutput.proof);

    const { inputNote1, inputNote2, outputNote1, outputNote2 } = proofOutput;
    const userTx: UserTx = {
      action,
      txHash,
      inputNote1,
      inputNote2,
      outputNote1: action !== 'TRANSFER' ? outputNote1 : undefined,
      outputNote2,
      settled: false,
      ...input,
    };
    await userState.addUserTx(userTx);
    this.emit(SdkEvent.NEW_USER_TX, userTx.userId);
    this.emit(CoreSdkEvent.NEW_USER_TX, userTx.userId);
    return txHash;
  }

  public async deposit(value: number, publicAddress: Buffer) {
    return await this.createProof('DEPOSIT', value, this.user.publicKey, publicAddress);
  }

  public async withdraw(value: number, publicAddress: Buffer) {
    return await this.createProof('WITHDRAW', value, this.user.publicKey, publicAddress);
  }

  public async transfer(value: number, recipient: Buffer) {
    return await this.createProof('TRANSFER', value, recipient);
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

  public async awaitSettlement(txHash: TxHash) {
    while (true) {
      const tx = await this.getUserState(this.user.id)!.getUserTx(txHash);
      if (!tx) {
        throw new Error(`Transaction hash not found: ${txHash.toString('hex')}`);
      }
      if (tx.settled === true) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private getUserState(userId: number) {
    return this.userStates.find(us => us.getUser().id === userId);
  }

  public getUser() {
    return this.user;
  }

  public getUsers(localOnly: boolean = true) {
    return this.users.filter(u => !localOnly || u.privateKey);
  }

  public async createUser(alias?: string) {
    const user = this.userFactory.createUser(this.users.length, alias);
    this.db.addUser(user);
    await this.initUsers();
    this.emit(CoreSdkEvent.UPDATED_USERS, this.users);
    return user;
  }

  public async addUser(alias: string, publicKey: Buffer) {
    if (this.users.find(u => u.alias === alias)) {
      throw new Error('Alias already exists.');
    }

    const user: User = { id: this.users.length, publicKey, alias };
    this.db.addUser(user);
    await this.initUsers();
    this.emit(CoreSdkEvent.UPDATED_USERS, this.users);
    return user;
  }

  public switchToUser(userIdOrAlias: string | number) {
    const user = this.findUser(userIdOrAlias);
    if (!user) {
      throw new Error('Local user not found.');
    }

    this.user = user;
    debug(`switching to user id: ${user.id}`);
    this.emit(SdkEvent.UPDATED_ACCOUNT, this.user);
    this.emit(SdkEvent.UPDATED_BALANCE, this.getBalance());
    return user;
  }

  public getBalance(userIdOrAlias?: string | number) {
    const user = (userIdOrAlias !== undefined && this.findUser(userIdOrAlias)) || this.user;
    return this.getUserState(user.id)!.getBalance();
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

  public async getUserTxs(userId: number) {
    const userState = this.getUserState(userId);
    return userState ? await userState.getUserTxs() : [];
  }

  public findUser(userIdOrAlias: string | number, remote: boolean = false) {
    return this.users
      .filter(u => remote || u.privateKey)
      .find(u => u.id.toString() === userIdOrAlias.toString() || u.alias === userIdOrAlias);
  }

  public startTrackingGlobalState() {
    this.txsState.on('rollups', rollups => this.emit(SdkEvent.UPDATED_EXPLORER_ROLLUPS, rollups));
    this.txsState.on('txs', txs => this.emit(SdkEvent.UPDATED_EXPLORER_TXS, txs));
    this.txsState.start();
  }

  public stopTrackingGlobalState() {
    this.txsState.removeAllListeners();
    this.txsState.stop();
  }
}

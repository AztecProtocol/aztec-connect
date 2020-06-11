import { BlockSource, Block } from 'barretenberg-es/block_source';
import {
  LocalRollupProvider,
  RollupProvider,
  ServerRollupProvider,
  RollupProviderExplorer,
} from 'barretenberg-es/rollup_provider';
import { ServerBlockSource } from 'barretenberg-es/block_source/server_block_source';
import { JoinSplitProver, JoinSplitVerifier } from 'barretenberg-es/client_proofs/join_split_proof';
import { Prover } from 'barretenberg-es/client_proofs/prover';
import { Crs } from 'barretenberg-es/crs';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';
import { Pedersen } from 'barretenberg-es/crypto/pedersen';
import { PooledFft } from 'barretenberg-es/fft';
import { PooledPippenger } from 'barretenberg-es/pippenger';
import { BarretenbergWasm } from 'barretenberg-es/wasm';
import { WorkerPool } from 'barretenberg-es/wasm/worker_pool';
import { WorldState } from 'barretenberg-es/world_state';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import leveljs from 'level-js';
import levelup from 'levelup';
import { DbUser, DexieDatabase } from './database';
import { JoinSplitProofCreator } from './join_split_proof';
import { TxsState } from './txs_state';
import { UserState } from './user_state';
import { Grumpkin } from 'barretenberg-es/ecc/grumpkin';
import { MemoryFifo } from 'barretenberg-es/fifo';
import { User, createUser } from './user';

const debug = createDebug('bb:app');

function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    privateKey: dbUser.privateKey ? Buffer.from(dbUser.privateKey) : undefined,
    publicKey: Buffer.from(dbUser.publicKey),
    alias: dbUser.alias,
  };
}

export enum AppInitState {
  UNINITIALIZED = 'Uninitialized',
  INITIALIZING = 'Initializing',
  INITIALIZED = 'Initialized',
}

export enum AppEvent {
  INIT = 'INIT',
  PROOF = 'PROOF',
  UPDATED_BALANCE = 'UPDATED_BALANCE',
  UPDATED_ACCOUNT = 'UPDATED_ACCOUNT',
  UPDATED_USERS = 'UPDATED_USERS',
  UPDATED_ROLLUPS = 'UPDATED_ROLLUPS',
  UPDATED_TXS = 'UPDATED_TXS',
  UPDATED_USER_TXS = 'UPDATED_USER_TXS',
}

export enum ProofState {
  NADA = 'Nada',
  RUNNING = 'Running',
  FAILED = 'Failed',
  FINISHED = 'Finished',
}

export enum ProofApi {
  NADA = 'NADA',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  TRANSFER = 'TRANSFER',
}

interface ProofInput {
  userId: number;
  value: number;
  recipient: Buffer;
  created: Date;
}

export interface ProofEvent {
  state: ProofState;
  api: ProofApi;
  txId?: string;
  input?: ProofInput;
  time?: number;
}

export class App extends EventEmitter {
  private pool!: WorkerPool;
  private joinSplitProver!: JoinSplitProver;
  private joinSplitVerifier!: JoinSplitVerifier;
  private user!: User;
  private worldState!: WorldState;
  private users: User[] = [];
  private userStates: UserState[] = [];
  private joinSplitProofCreator!: JoinSplitProofCreator;
  private rollupProviderUrl = 'http://localhost';
  private rollupProvider!: RollupProvider;
  private rollupProviderExplorer = new RollupProviderExplorer(new URL(this.rollupProviderUrl));
  private blockSource!: BlockSource;
  private blockQueue!: MemoryFifo<Block>;
  private grumpkin!: Grumpkin;
  private blake2s!: Blake2s;
  private pedersen!: Pedersen;
  private db = new DexieDatabase();
  private txsState = new TxsState(this.rollupProviderExplorer);
  private leveldb = levelup(leveljs('hummus'));
  private initState = AppInitState.UNINITIALIZED;
  private proof: ProofEvent = { state: ProofState.NADA, api: ProofApi.NADA };

  constructor() {
    super();
  }

  public async init(serverUrl: string) {
    this.updateInitState(AppInitState.INITIALIZING);
    const circuitSize = 128 * 1024;

    if (serverUrl !== this.rollupProviderUrl) {
      this.rollupProviderUrl = serverUrl;
      this.rollupProviderExplorer = new RollupProviderExplorer(new URL(serverUrl));
      this.txsState = new TxsState(this.rollupProviderExplorer);
    }

    let crsData = await this.db.getKey(`crs-${circuitSize}`);
    let g2Data = await this.db.getKey(`crs-g2-${circuitSize}`);
    if (!crsData || !g2Data) {
      debug('downloading crs data...');
      const crs = new Crs(circuitSize);
      await crs.download();
      crsData = crs.getData();
      await this.db.addKey(`crs-${circuitSize}`, Buffer.from(crsData));
      g2Data = crs.getG2Data();
      await this.db.addKey(`crs-g2-${circuitSize}`, Buffer.from(g2Data));
      debug('done.');
    }

    const barretenberg = await BarretenbergWasm.new();

    this.pool = new WorkerPool();
    await this.pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8));

    const barretenbergWorker = this.pool.workers[0];

    const pippenger = new PooledPippenger();
    await pippenger.init(crsData, this.pool);

    const fft = new PooledFft(this.pool);
    await fft.init(circuitSize);

    const prover = new Prover(barretenbergWorker, pippenger, fft);

    this.pedersen = new Pedersen(barretenberg);
    this.blake2s = new Blake2s(barretenberg);
    this.joinSplitProver = new JoinSplitProver(barretenberg, prover);
    this.joinSplitVerifier = new JoinSplitVerifier();
    this.grumpkin = new Grumpkin(barretenberg);

    await this.startNewSession();

    const start = new Date().getTime();
    const provingKey = await this.db.getKey('join-split-proving-key');
    if (provingKey) {
      await this.joinSplitProver.loadKey(provingKey);
    } else {
      this.logAndDebug('computing proving key...');
      await this.joinSplitProver.computeKey();
      debug('saving...');
      const newProvingKey = await this.joinSplitProver.getKey();
      await this.db.addKey('join-split-proving-key', newProvingKey);
      this.logAndDebug(`complete: ${new Date().getTime() - start}ms`);
    }

    if (!serverUrl) {
      debug('creating verification key...');
      const verificationKey = await this.db.getKey('join-split-verification-key');
      if (verificationKey) {
        await this.joinSplitVerifier.loadKey(barretenbergWorker, verificationKey, g2Data);
      } else {
        debug('computing...');
        await this.joinSplitVerifier.computeKey(pippenger.pool[0], g2Data);
        debug('saving...');
        const newVerificationKey = await this.joinSplitVerifier.getKey();
        await this.db.addKey('join-split-verification-key', newVerificationKey);
      }
    }

    this.updateInitState(AppInitState.INITIALIZED);
  }

  private updateInitState(state: AppInitState) {
    this.initState = state;
    this.emit(AppEvent.INIT, state);
  }

  private updateCurrentProof(proof: ProofEvent) {
    this.proof = proof;
    this.emit(AppEvent.PROOF, proof);
  }

  public isInitialized() {
    return this.initState === AppInitState.INITIALIZED;
  }

  public getInitState() {
    return this.initState;
  }

  public getCurrentProof() {
    return this.proof;
  }

  public getDataRoot() {
    return this.worldState.getRoot();
  }

  public getDataSize() {
    return this.worldState.getSize();
  }

  private log(str: string) {
    this.emit('log', str + '\n');
  }

  private logAndDebug(str: string) {
    debug(str);
    this.log(str);
  }

  public async destroy() {
    if (!this.isInitialized()) return;

    this.removeAllListeners();
    await this.pool.destroy();
    this.blockSource.stop();
    this.blockSource.removeAllListeners();
    this.blockQueue.cancel();
    this.txsState.stop();
  }

  private async startNewSession(userId: number = 0) {
    this.blockQueue = new MemoryFifo<Block>();

    this.initRollupProvider();

    this.worldState = new WorldState(this.leveldb, this.pedersen, this.blake2s);
    await this.worldState.init();

    await this.initUsers();
    this.switchToUser(userId);

    this.processBlockQueue();
  }

  public async getStatus() {
    return await this.rollupProvider.status();
  }

  private async initUsers() {
    this.users = (await this.db.getUsers()).map(dbUserToUser);
    if (!this.users.length) {
      this.user = await this.createUser();
      debug(`created new user:`, this.user);
    } else {
      this.userStates = this.users
        .filter(u => u.privateKey)
        .map(u => new UserState(u, this.grumpkin, this.blake2s, this.db));
      await Promise.all(this.userStates.map(us => us.init()));
    }
    this.user = this.users[0];
  }

  private initRollupProvider() {
    if (this.rollupProviderUrl) {
      this.initServerRollupProvider(this.rollupProviderUrl);
    } else {
      this.initLocalRollupProvider();
    }
    this.blockSource.on('block', b => this.blockQueue.put(b));
    this.blockSource.start();
  }

  private initLocalRollupProvider() {
    debug('No server url provided. Use local rollup provider.');
    const lrp = new LocalRollupProvider(this.joinSplitVerifier);
    this.blockSource = lrp;
    this.rollupProvider = lrp;
  }

  private initServerRollupProvider(serverUrl: string) {
    const url = new URL(serverUrl);
    const fromBlock = window.localStorage.getItem('syncedToBlock') || -1;
    this.blockSource = new ServerBlockSource(url, +fromBlock + 1);
    this.rollupProvider = new ServerRollupProvider(url);
  }

  private async processBlockQueue() {
    while (true) {
      const block = await this.blockQueue.get();
      if (!block) {
        break;
      }

      const balanceBefore = this.getBalance();

      await this.worldState.processBlock(block);

      const updates = await Promise.all(
        this.userStates.map(async us => {
          const updated = await us.processBlock(block);
          return { userId: us.getUser().id, updated };
        }),
      );
      if (updates.some(x => x.updated)) {
        this.emit(AppEvent.UPDATED_BALANCE, this.getBalance());
        updates.filter(u => u.updated).forEach(u => this.emit(AppEvent.UPDATED_USER_TXS, u.userId));
      }

      window.localStorage.setItem('syncedToBlock', block.blockNum.toString());

      const diff = this.getBalance() - balanceBefore;
      if (this.isInitialized() && diff !== 0) {
        this.log(`balance updated: ${this.getBalance()} (${diff >= 0 ? '+' : ''}${diff})`);
      }
    }
  }

  public async deposit(value: number) {
    const created = Date.now();
    const user = this.getUser();
    const recipient = user.publicKey;
    const input = { userId: user.id, value, recipient, created: new Date(created) };
    this.updateCurrentProof({ api: ProofApi.DEPOSIT, state: ProofState.RUNNING, input });
    try {
      const { proof, outputNote1, outputNote2 } = await this.joinSplitProofCreator.createProof(
        value,
        0,
        0,
        user,
        recipient,
      );
      const { txId } = await this.rollupProvider.sendProof(proof);
      const userState = this.getUserState(user.id);
      await userState.addUserTx({ action: 'DEPOSIT', txId, outputNote1, outputNote2, settled: false, ...input });
      this.emit(AppEvent.UPDATED_USER_TXS, user.id);
      this.updateCurrentProof({
        api: ProofApi.DEPOSIT,
        state: ProofState.FINISHED,
        txId,
        input,
        time: Date.now() - created,
      });
    } catch (e) {
      debug(e);
      this.updateCurrentProof({ api: ProofApi.DEPOSIT, state: ProofState.FAILED, input, time: Date.now() - created });
    }
  }

  public async withdraw(value: number) {
    const created = Date.now();
    const user = this.getUser();
    const recipient = user.publicKey;
    const input = { userId: user.id, value, recipient, created: new Date(created) };
    this.updateCurrentProof({ api: ProofApi.WITHDRAW, state: ProofState.RUNNING, input });
    try {
      const { proof, inputNote1, inputNote2, outputNote1, outputNote2 } = await this.joinSplitProofCreator.createProof(
        0,
        value,
        0,
        user,
        recipient,
      );
      const { txId } = await this.rollupProvider.sendProof(proof);
      const userState = this.getUserState(user.id);
      await userState.addUserTx({
        action: 'WITHDRAW',
        txId,
        inputNote1,
        inputNote2,
        outputNote1,
        outputNote2,
        settled: false,
        ...input,
      });
      this.emit(AppEvent.UPDATED_USER_TXS, user.id);
      this.updateCurrentProof({
        api: ProofApi.WITHDRAW,
        state: ProofState.FINISHED,
        txId,
        input,
        time: Date.now() - created,
      });
    } catch (e) {
      debug(e);
      this.updateCurrentProof({ api: ProofApi.WITHDRAW, state: ProofState.FAILED, input, time: Date.now() - created });
    }
  }

  public async transfer(value: number, recipientStr: string) {
    const created = Date.now();
    const user = this.getUser();
    const recipient = Buffer.from(recipientStr, 'hex');
    const input = { userId: user.id, value, recipient, created: new Date(created) };
    this.updateCurrentProof({ api: ProofApi.TRANSFER, state: ProofState.RUNNING, input });
    try {
      const { proof, inputNote1, inputNote2, outputNote1, outputNote2 } = await this.joinSplitProofCreator.createProof(
        0,
        0,
        value,
        user,
        recipient,
      );
      const { txId } = await this.rollupProvider.sendProof(proof);
      const userState = this.getUserState(user.id);
      await userState.addUserTx({
        action: 'TRANSFER',
        txId,
        inputNote1,
        inputNote2,
        outputNote1,
        outputNote2,
        settled: false,
        ...input,
      });
      this.emit(AppEvent.UPDATED_USER_TXS, user.id);
      this.updateCurrentProof({
        api: ProofApi.TRANSFER,
        state: ProofState.FINISHED,
        txId,
        input,
        time: Date.now() - created,
      });
    } catch (e) {
      debug(e);
      this.updateCurrentProof({ api: ProofApi.TRANSFER, state: ProofState.FAILED, input, time: Date.now() - created });
    }
  }

  private getUserState(userId: number) {
    return this.userStates.find(us => us.getUser().id === userId)!;
  }

  public getUser() {
    return this.user;
  }

  public getUsers() {
    return [...this.users];
  }

  public async createUser(alias?: string) {
    const users = await this.db.getUsers();
    const user = createUser(users.length, this.grumpkin, alias);
    this.users.push(user);
    this.db.addUser(user);
    const userState = new UserState(user, this.grumpkin, this.blake2s, this.db);
    await userState.init();
    this.userStates.push(userState);
    this.emit(AppEvent.UPDATED_USERS, [...this.users]);
    return user;
  }

  public async addUser(alias: string, publicKey: Buffer) {
    if (this.users.find(u => u.alias === alias)) {
      throw new Error('Alias already exists.');
    }
    const users = await this.db.getUsers();
    const user: User = { id: users.length, publicKey, alias };
    this.users.push(user);
    this.db.addUser(user);
    this.emit(AppEvent.UPDATED_USERS, [...this.users]);
    return user;
  }

  public switchToUser(userIdOrAlias: string | number) {
    userIdOrAlias = userIdOrAlias.toString();
    const user = this.findUser(userIdOrAlias);
    if (!user) {
      throw new Error('Local user not found.');
    }
    this.user = user;
    debug(`switching to user id: ${user.id}`);
    this.joinSplitProofCreator = new JoinSplitProofCreator(
      this.joinSplitProver,
      this.userStates.find(us => us.getUser().id === user.id)!,
      this.worldState,
      this.grumpkin,
    );
    this.emit(AppEvent.UPDATED_ACCOUNT, this.user);
    this.emit(AppEvent.UPDATED_BALANCE, this.getBalance());
    return user;
  }

  public getBalance(userIdOrAlias?: string | number) {
    const user = userIdOrAlias ? this.findUser(userIdOrAlias) || this.user : this.user;
    return this.getUserState(user.id).getBalance();
  }

  public getLatestRollups() {
    return this.txsState.getLatestRollups();
  }

  public getLatestTxs() {
    return this.txsState.getLatestTxs();
  }

  public getUserTxs(userId: number) {
    const userState = this.getUserState(userId);
    return userState ? userState.getUserTxs() : [];
  }

  public async getRollup(id: number) {
    return this.txsState.getRollup(id);
  }

  public async getTx(txId: string) {
    return this.txsState.getTx(txId);
  }

  public findUser(userIdOrAlias: string | number, remote: boolean = false) {
    userIdOrAlias = userIdOrAlias.toString();
    const user = this.users
      .filter(u => remote || u.privateKey)
      .find(u => {
        return u.id.toString() === userIdOrAlias || u.alias === userIdOrAlias;
      });
    return user;
  }

  public startTrackingGlobalState() {
    this.txsState.on('rollups', rollups => this.emit(AppEvent.UPDATED_ROLLUPS, rollups));
    this.txsState.on('txs', txs => this.emit(AppEvent.UPDATED_TXS, txs));
    this.txsState.start();
  }

  public stopTrackingGlobalState() {
    this.txsState.removeAllListeners();
    this.txsState.stop();
  }

  public async clearNoteData() {
    if (this.isInitialized()) {
      this.blockSource.stop();
      this.blockSource.removeAllListeners();
      this.blockQueue.cancel();
    }

    await this.leveldb.clear();
    localStorage.removeItem('syncedToBlock');
    await this.db.clearNote();
    await this.db.clearUserTxState();

    if (this.isInitialized()) {
      const userId = this.user.id;
      await this.startNewSession(userId);
    }
  }
}

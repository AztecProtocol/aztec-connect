import { BlockSource, Block } from 'barretenberg-es/block_source';
import { LocalRollupProvider, RollupProvider, ServerRollupProvider } from 'barretenberg-es/rollup_provider';
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

export class App extends EventEmitter {
  private pool!: WorkerPool;
  private joinSplitProver!: JoinSplitProver;
  private joinSplitVerifier!: JoinSplitVerifier;
  private user!: User;
  private worldState!: WorldState;
  private users: User[] = [];
  private userStates: UserState[] = [];
  private joinSplitProofCreator!: JoinSplitProofCreator;
  private rollupProvider!: RollupProvider;
  private blockSource!: BlockSource;
  private grumpkin!: Grumpkin;
  private blake2s!: Blake2s;
  private db = new DexieDatabase();
  private blockQueue = new MemoryFifo<Block>();
  private initialized = false;

  public async init(serverUrl: string) {
    const circuitSize = 128 * 1024;

    const crs = new Crs(circuitSize);
    await crs.download();

    const barretenberg = await BarretenbergWasm.new();

    this.pool = new WorkerPool();
    await this.pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8));

    const barretenbergWorker = this.pool.workers[0];

    const pippenger = new PooledPippenger();
    await pippenger.init(crs.getData(), this.pool);

    const fft = new PooledFft(this.pool);
    await fft.init(circuitSize);

    const prover = new Prover(barretenbergWorker, pippenger, fft);

    const pedersen = new Pedersen(barretenberg);
    this.blake2s = new Blake2s(barretenberg);
    this.joinSplitProver = new JoinSplitProver(barretenberg, prover);
    this.joinSplitVerifier = new JoinSplitVerifier(pippenger.pool[0]);

    // this.initLocalRollupProvider();
    this.initServerRollupProvider(serverUrl);

    const leveldb = levelup(leveljs('hummus'));
    this.worldState = new WorldState(leveldb, pedersen, this.blake2s);
    await this.worldState.init();
    const { dataSize, dataRoot, nullRoot } = await this.rollupProvider.status();
    this.log(`data size: ${dataSize}`);
    this.log(`data root: ${dataRoot.slice(0, 8).toString('hex')}...`);
    this.log(`null root: ${nullRoot.slice(0, 8).toString('hex')}...`);

    this.grumpkin = new Grumpkin(barretenberg);

    await this.initUsers();
    this.switchToUser(0);
    this.log(`user: ${this.getUser().publicKey.slice(0, 4).toString('hex')}...`);
    this.log(`balance: ${this.getBalance()}`);

    this.processBlockQueue();

    this.logAndDebug('creating keys...');
    const start = new Date().getTime();
    await this.joinSplitProver.init();
    await this.joinSplitVerifier.init(crs.getG2Data());
    this.logAndDebug(`created circuit keys: ${new Date().getTime() - start}ms`);

    this.initialized = true;
  }

  public isInitialised() {
    return this.initialized;
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
    await this.pool.destroy();
    this.blockSource.removeAllListeners();
    this.blockQueue.cancel();
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

  private initLocalRollupProvider() {
    const lrp = new LocalRollupProvider(this.joinSplitVerifier);
    this.rollupProvider = lrp;
    this.blockSource = lrp;
    this.blockSource.on('block', b => this.blockQueue.put(b));
  }

  private initServerRollupProvider(serverUrl: string) {
    const url = new URL(serverUrl);
    const fromBlock = window.localStorage.getItem('syncedToBlock') || -1;
    const sbs = new ServerBlockSource(url, +fromBlock + 1);
    this.rollupProvider = new ServerRollupProvider(url);
    this.blockSource = sbs;
    this.blockSource.on('block', b => this.blockQueue.put(b));
    sbs.start();
  }

  private async processBlockQueue() {
    while (true) {
      const block = await this.blockQueue.get();
      if (!block) {
        break;
      }

      const balanceBefore = this.getBalance();

      await this.worldState.processBlock(block);
      const updates = await Promise.all(this.userStates.map(us => us.processBlock(block)));
      if (updates.some(x => x)) {
        this.emit('updated');
      }
      window.localStorage.setItem('syncedToBlock', block.blockNum.toString());

      if (this.initialized && this.getBalance() !== balanceBefore) {
        this.log(`balance updated: ${this.getBalance()}`);
      }
    }
  }

  public async deposit(value: number) {
    const user = this.getUser();
    const proof = await this.joinSplitProofCreator.createProof(value, 0, 0, user, user.publicKey);
    await this.rollupProvider.sendProof(proof);
  }

  public async withdraw(value: number) {
    const user = this.getUser();
    const proof = await this.joinSplitProofCreator.createProof(0, value, 0, user, user.publicKey);
    await this.rollupProvider.sendProof(proof);
  }

  public async transfer(value: number, receiverPubKey: Buffer) {
    const user = this.getUser();
    const proof = await this.joinSplitProofCreator.createProof(0, 0, value, user, receiverPubKey);
    await this.rollupProvider.sendProof(proof);
  }

  public getUser() {
    return this.user;
  }

  public getUsers() {
    return this.users;
  }

  public async createUser(alias?: string) {
    const users = await this.db.getUsers();
    const user = createUser(users.length, this.grumpkin, alias);
    this.users.push(user);
    this.db.addUser(user);
    const userState = new UserState(user, this.grumpkin, this.blake2s, this.db);
    await userState.init();
    this.userStates.push(userState);
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
    this.emit('updated');
    return user;
  }

  public getBalance(userIdOrAlias?: string | number) {
    const user = userIdOrAlias ? this.findUser(userIdOrAlias) || this.user : this.user;
    return this.userStates.find(us => us.getUser().id === user.id)!.getBalance();
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
}

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

createDebug.enable('bb:*');
const debug = createDebug('bb:app');

function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    privateKey: Buffer.from(dbUser.privateKey),
    publicKey: Buffer.from(dbUser.publicKey),
  };
}

export class App extends EventEmitter {
  private pool!: WorkerPool;
  private joinSplitProver!: JoinSplitProver;
  private joinSplitVerifier!: JoinSplitVerifier;
  private user!: User;
  private worldState!: WorldState;
  private userState!: UserState;
  private joinSplitProofCreator!: JoinSplitProofCreator;
  private rollupProvider!: RollupProvider;
  private blockSource!: BlockSource;
  private grumpkin!: Grumpkin;
  private blake2s!: Blake2s;
  private db = new DexieDatabase();
  private blockQueue = new MemoryFifo<Block>();

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

    this.grumpkin = new Grumpkin(barretenberg);

    this.joinSplitProofCreator = new JoinSplitProofCreator(
      this.joinSplitProver,
      this.userState,
      this.worldState,
      this.grumpkin
    );

    this.blockSource.on('block', (b) => this.blockQueue.put(b));

    await this.initUser();

    debug('creating keys...');
    const start = new Date().getTime();
    // await this.joinSplitProver.init();
    // await this.joinSplitVerifier.init(crs.getG2Data());
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
  }

  private async initUser() {
    const users = await this.getUsers();
    if (users.length) {
      await this.switchToUser(users[0].id);
    } else {
      const user = await this.createUser();
      debug(`created new user:`, user);
      await this.switchToUser(user.id);
    }
  }

  private initLocalRollupProvider() {
    const lrp = new LocalRollupProvider(this.joinSplitVerifier);
    this.rollupProvider = lrp;
    this.blockSource = lrp;
  }

  private initServerRollupProvider(serverUrl: string) {
    const url = new URL(serverUrl);
    const sbs = new ServerBlockSource(url);
    this.rollupProvider = new ServerRollupProvider(url);
    this.blockSource = sbs;
    sbs.start();
  }

  private async processBlockQueue() {
    while (true) {
      const block = await this.blockQueue.get();
      if (!block) {
        break;
      }
      await this.worldState.processBlock(block);
      await this.userState.processBlock(block);
    }
  }

  public async deposit(value: number) {
    const proof = await this.joinSplitProofCreator.createProof(value, 0, 0, this.user, this.user.publicKey);
    await this.rollupProvider.sendProof(proof);
  }

  public async withdraw(value: number) {
    const proof = await this.joinSplitProofCreator.createProof(0, value, 0, this.user, this.user.publicKey);
    await this.rollupProvider.sendProof(proof);
  }

  public async transfer(value: number, receiverPubKey: Buffer) {
    const proof = await this.joinSplitProofCreator.createProof(0, 0, value, this.user, receiverPubKey);
    await this.rollupProvider.sendProof(proof);
  }

  public async destroy() {
    await this.pool.destroy();
    this.blockQueue.cancel();
  }

  public getUser() {
    return this.user;
  }

  public async getUsers() {
    const dbUsers = await this.db.getUsers();
    return dbUsers.map(dbUserToUser);
  }

  public async createUser() {
    const users = await this.db.getUsers();
    const user = createUser(users.length, this.grumpkin);
    this.db.addUser(user);
    return user;
  }

  public async switchToUser(userId: number) {
    const dbUser = await this.db.getUser(userId);
    if (!dbUser) {
      throw new Error('User not found.');
    }
    this.user = dbUserToUser(dbUser);
    debug(`Switching to user:`, this.user);
    this.userState = new UserState(this.user, this.grumpkin, this.blake2s, this.db);
    await this.userState.init();
  }

  public getBalance() {
    return this.userState.getBalance();
  }
}

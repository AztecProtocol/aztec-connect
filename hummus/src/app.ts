import { BlockSource } from 'barretenberg-es/block_source';
import { ServerBlockSource } from 'barretenberg-es/block_source/server_block_source';
import { JoinSplitProver, JoinSplitVerifier } from 'barretenberg-es/client_proofs/join_split_proof';
import { Prover } from 'barretenberg-es/client_proofs/prover';
import { Crs } from 'barretenberg-es/crs';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';
import { Pedersen } from 'barretenberg-es/crypto/pedersen';
import { Schnorr } from 'barretenberg-es/crypto/schnorr';
import { PooledFft } from 'barretenberg-es/fft';
import { PooledPippenger } from 'barretenberg-es/pippenger';
import { BarretenbergWasm } from 'barretenberg-es/wasm';
import { WorkerPool } from 'barretenberg-es/wasm/worker_pool';
import { WorldState } from 'barretenberg-es/world_state';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import leveljs from 'level-js';
import levelup from 'levelup';
import { db, User as UserEntity } from './database';
import { JoinSplitProofCreator } from './join_split_proof_creator';
import { LocalRollupProvider } from './rollup_provider/local_rollup_provider';
import { RollupProvider } from './rollup_provider/rollup_provider';
import { ServerRollupProvider } from './rollup_provider/server_rollup_provider';
import { User, UserState } from './user_state';
import { randomInt } from './utils/random';

createDebug.enable('bb:*');
const debug = createDebug('bb:app');

export class App extends EventEmitter {
  private pool!: WorkerPool;
  private schnorr!: Schnorr;
  private joinSplitProver!: JoinSplitProver;
  private joinSplitVerifier!: JoinSplitVerifier;
  private user!: User;
  private worldState!: WorldState;
  private userState!: UserState;
  private joinSplitProofCreator!: JoinSplitProofCreator;
  private rollupProvider!: RollupProvider;
  private blockSource!: BlockSource;

  public createUser(id: number): User {
    const privateKey = Buffer.from([...Array(32)].map(() => randomInt(0, 255)));
    const publicKey = this.schnorr.computePublicKey(privateKey);
    return { id, privateKey, publicKey };
  }

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

    const blake2s = new Blake2s(barretenberg);
    const pedersen = new Pedersen(barretenberg);
    this.schnorr = new Schnorr(barretenberg);
    this.joinSplitProver = new JoinSplitProver(barretenberg, prover);
    this.joinSplitVerifier = new JoinSplitVerifier(pippenger.pool[0]);

    // this.initLocalRollupProvider();
    this.initServerRollupProvider(serverUrl);

    const leveldb = levelup(leveljs('hummus'));
    this.worldState = new WorldState(leveldb, pedersen, blake2s, this.blockSource);

    this.userState = new UserState(this.user, this.joinSplitProver, this.worldState, blake2s);
    this.userState.on('updated', () => this.emit('updated'));
    const user = await this.userState.init();
    if (user) {
      this.user = user;
    } else {
      await this.switchToNewUser();
    }

    this.joinSplitProofCreator = new JoinSplitProofCreator(this.joinSplitProver, this.userState, this.worldState);

    this.worldState.start();

    debug('creating keys...');
    const start = new Date().getTime();
    await this.joinSplitProver.init();
    await this.joinSplitVerifier.init(crs.getG2Data());
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
  }

  public initLocalRollupProvider() {
    const lrp = new LocalRollupProvider(this.joinSplitVerifier);
    this.rollupProvider = lrp;
    this.blockSource = lrp;
  }

  public initServerRollupProvider(serverUrl: string) {
    const url = new URL(serverUrl);
    const sbs = new ServerBlockSource(url);
    this.rollupProvider = new ServerRollupProvider(url);
    this.blockSource = sbs;
    sbs.start();
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
    this.worldState.stop();
  }

  public getUser() {
    return this.user;
  }

  public getUsers() {
    return this.userState.getUsers();
  }

  public async switchUser(id: number) {
    const user = await this.userState.switchUser(id);
    if (!user) { return; }

    this.user = user;
  }

  public async switchToNewUser() {
    const id = await db.user.count();
    const user = this.createUser(id);
    await db.user.add(new UserEntity(user.id, user.publicKey, user.privateKey));
    this.userState.addUser(user);
    await this.userState.switchUser(user.id);
    this.user = user;
    return user;
  }

  public getBalance() {
    return this.userState.getBalance();
  }
}

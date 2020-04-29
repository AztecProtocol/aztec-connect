import levelup from 'levelup';
import leveljs from 'level-js';
import createDebug from 'debug';
import { PooledFft } from 'barretenberg-es/fft';
import { PooledPippenger } from 'barretenberg-es/pippenger';
import { JoinSplitProver, JoinSplitVerifier } from 'barretenberg-es/client_proofs/join_split_proof';
import { Prover } from 'barretenberg-es/client_proofs/prover';
import { Schnorr } from 'barretenberg-es/crypto/schnorr';
import { Crs } from 'barretenberg-es/crs';
import { BarretenbergWasm } from 'barretenberg-es/wasm';
import { WorkerPool } from 'barretenberg-es/wasm/worker_pool';
import { WorldState } from 'barretenberg-es/world_state';
import { UserState, User } from './user_state';
import { JoinSplitProofCreator } from './join_split_proof_creator';
import { LocalRollupProvider } from './local_rollup_provider';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';
import { Pedersen } from 'barretenberg-es/crypto/pedersen';
import { EventEmitter } from 'events';
import { randomInt } from './utils/random';
import { db, User as UserEntity } from './database';

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
  private rollupProvider!: LocalRollupProvider;

  public createUser(id: number): User {
    const privateKey = Buffer.from([...Array(32)].map(() => randomInt(0, 255)));
    const publicKey = this.schnorr.computePublicKey(privateKey);
    return { id, privateKey, publicKey };
  }

  public async init() {
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
    this.rollupProvider = new LocalRollupProvider(this.joinSplitVerifier);

    const localNotes = await db.note.toArray();
    if (localNotes.length) {
      const maxLocalId = localNotes.reduce((maxId, n) => Math.max(maxId, n.id), 0);
      const numberOfLeaves = 2 * Math.ceil((maxLocalId + 1) / 2);
      this.rollupProvider.appendBlock(1, numberOfLeaves);
    }

    const leveldb = levelup(leveljs('hummus'));
    this.worldState = new WorldState(leveldb, pedersen, blake2s, this.rollupProvider);

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
    if (!user) return;

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

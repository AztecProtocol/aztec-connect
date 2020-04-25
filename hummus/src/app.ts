import levelup from 'levelup';
import memdown from 'memdown';
import createDebug from 'debug';
import { PooledFft } from 'barretenberg-es/fft';
import { PooledPippenger } from 'barretenberg-es/pippenger';
import { JoinSplitProver, JoinSplitVerifier, JoinSplitTx } from 'barretenberg-es/client_proofs/join_split_proof';
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

  public createUser(): User {
    // prettier-ignore
    const privateKey = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
      0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb]);
    const publicKey = this.schnorr.computePublicKey(privateKey);
    return { privateKey, publicKey }
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

    const db = levelup(memdown());
    this.worldState = new WorldState(db, pedersen, blake2s, this.rollupProvider);
    this.user = this.createUser();
    this.userState = new UserState(this.user, this.joinSplitProver, this.worldState, blake2s);

    this.joinSplitProofCreator = new JoinSplitProofCreator(this.joinSplitProver, this.userState, this.worldState);

    this.worldState.start();

    this.userState.on('updated', () => this.emit('updated'));

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

  public getBalance() {
    return this.userState.getBalance();
  }
}
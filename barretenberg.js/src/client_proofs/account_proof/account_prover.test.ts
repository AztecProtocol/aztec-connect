import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import levelup from 'levelup';
import memdown from 'memdown';
import { Schnorr } from '../../crypto/schnorr';
import { BarretenbergWasm } from '../../wasm';
import { MerkleTree } from '../../merkle_tree';
import { Blake2s } from '../../crypto/blake2s';
import { Pedersen } from '../../crypto/pedersen';
import { Crs } from '../../crs';
import { WorkerPool } from '../../wasm/worker_pool';
import { PooledPippenger } from '../../pippenger';
import { PooledFft } from '../../fft';
import { UnrolledProver } from '../prover';
import { AccountProver, AccountVerifier, AccountTx } from './index';
import { GrumpkinAddress } from '../../address';
import { computeSigningData } from './compute_signing_data';

const debug = createDebug('bb:account_proof_test');

jest.setTimeout(120000);

describe('account proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let accountProver!: AccountProver;
  let accountVerifier!: AccountVerifier;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  let schnorr!: Schnorr;
  let crs!: Crs;
  let pippenger!: PooledPippenger;

  beforeAll(async () => {
    EventEmitter.defaultMaxListeners = 32;
    const circuitSize = 64 * 1024;

    crs = new Crs(circuitSize);
    await crs.download();

    barretenberg = await BarretenbergWasm.new();

    pool = new WorkerPool();
    await pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8));

    pippenger = new PooledPippenger();
    await pippenger.init(crs.getData(), pool);

    const fft = new PooledFft(pool);
    await fft.init(circuitSize);

    const prover = new UnrolledProver(pool.workers[0], pippenger, fft);

    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    schnorr = new Schnorr(barretenberg);

    accountProver = new AccountProver(prover);
    accountVerifier = new AccountVerifier();

    await accountProver.computeKey();
    await accountVerifier.computeKey(pippenger.pool[0], crs.getG2Data());
  });

  afterAll(async () => {
    await pool.destroy();
  });

  const createKeyPair = () => {
    const privateKey = randomBytes(32);
    const publicKey = new GrumpkinAddress(schnorr.computePublicKey(privateKey));
    return { privateKey, publicKey };
  };

  it('should get key data', async () => {
    const provingKey = await accountProver.getKey();
    expect(provingKey.length).toBeGreaterThan(0);

    const verificationKey = await accountVerifier.getKey();
    expect(verificationKey.length).toBeGreaterThan(0);
  });

  it('create and verify an account proof', async () => {
    const tree = new MerkleTree(levelup(memdown()), pedersen, blake2s, 'data', 32);

    const user = createKeyPair();

    const merkleRoot = tree.getRoot();

    const signingKey0 = createKeyPair();
    const signingKey1 = createKeyPair();

    const alias = Buffer.from('user_zero');
    const aliasField = blake2s.hashToField(alias);

    const accountPath = await tree.getHashPath(0);

    const message = computeSigningData(
      user.publicKey,
      signingKey0.publicKey,
      signingKey1.publicKey,
      aliasField,
      user.publicKey,
      pedersen,
    );
    const signature = schnorr.constructSignature(message, user.privateKey);

    const tx = new AccountTx(
      merkleRoot,
      user.publicKey,
      2,
      signingKey0.publicKey,
      signingKey1.publicKey,
      true,
      aliasField,
      true,
      user.publicKey,
      0,
      user.publicKey,
      accountPath,
      signature,
    );

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await accountProver.createAccountProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const verified = await accountVerifier.verifyProof(proof);
    expect(verified).toBe(true);
  });
});

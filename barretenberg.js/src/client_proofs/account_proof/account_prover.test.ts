import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import levelup from 'levelup';
import memdown from 'memdown';
import { AccountAliasId, AliasHash } from '../../account_id';
import { GrumpkinAddress } from '../../address';
import { Crs } from '../../crs';
import { Blake2s, Pedersen, Schnorr } from '../../crypto';
import { PooledFft } from '../../fft';
import { MerkleTree } from '../../merkle_tree';
import { NoteAlgorithms } from '../../note_algorithms';
import { PooledPippenger } from '../../pippenger';
import { BarretenbergWasm, WorkerPool } from '../../wasm';
import { ProofData } from '../proof_data';
import { UnrolledProver } from '../prover';
import { AccountProver, AccountTx, AccountVerifier } from './index';

const debug = createDebug('bb:account_proof_test');

jest.setTimeout(120000);

describe('account proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let noteAlgos: NoteAlgorithms;
  let accountProver!: AccountProver;
  let accountVerifier!: AccountVerifier;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  let schnorr!: Schnorr;
  let crs!: Crs;
  let pippenger!: PooledPippenger;

  beforeAll(async () => {
    EventEmitter.defaultMaxListeners = 32;
    const circuitSize = AccountProver.circuitSize;

    crs = new Crs(circuitSize);
    await crs.download();

    barretenberg = await BarretenbergWasm.new();

    pool = new WorkerPool();
    await pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8));

    pippenger = new PooledPippenger();
    await pippenger.init(crs.getData(), pool);

    const fft = new PooledFft(pool);
    await fft.init(circuitSize);

    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    schnorr = new Schnorr(barretenberg);

    noteAlgos = new NoteAlgorithms(barretenberg);

    const prover = new UnrolledProver(pool.workers[0], pippenger, fft);
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
    const tree = new MerkleTree(levelup(memdown()), pedersen, 'data', 32);

    const user = createKeyPair();
    const newAccountPublicKey = user.publicKey;

    const merkleRoot = tree.getRoot();

    const numNewKeys = 2;
    const signingKey0 = createKeyPair();
    const signingKey1 = createKeyPair();

    const aliasHash = AliasHash.fromAlias('user_zero', blake2s);
    const nonce = 0;
    const accountAliasId = new AccountAliasId(aliasHash, nonce);

    const migrate = true;

    const accountIndex = 0;
    const accountPath = await tree.getHashPath(0);

    const tx = new AccountTx(
      merkleRoot,
      user.publicKey,
      newAccountPublicKey,
      numNewKeys,
      signingKey0.publicKey,
      signingKey1.publicKey,
      accountAliasId,
      migrate,
      randomBytes(32),
      accountIndex,
      accountPath,
      user.publicKey,
    );
    const signingData = await accountProver.computeSigningData(tx);
    const signature = schnorr.constructSignature(signingData, user.privateKey);

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await accountProver.createAccountProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const verified = await accountVerifier.verifyProof(proof);
    expect(verified).toBe(true);

    // Check public inputs
    const accountProof = new ProofData(proof);
    const newAccountAliasId = new AccountAliasId(aliasHash, nonce + 1);
    const accountAliasIdNullifier = noteAlgos.accountAliasIdNullifier(accountAliasId);
    expect(accountProof.publicInput).toEqual(newAccountPublicKey.x());
    expect(accountProof.publicOutput).toEqual(newAccountPublicKey.y());
    expect(accountProof.assetId).toEqual(newAccountAliasId.toBuffer());
    expect(accountProof.nullifier1).toEqual(accountAliasIdNullifier);
    expect(accountProof.inputOwner).toEqual(signingKey0.publicKey.x());
    expect(accountProof.outputOwner).toEqual(signingKey1.publicKey.x());
  });
});

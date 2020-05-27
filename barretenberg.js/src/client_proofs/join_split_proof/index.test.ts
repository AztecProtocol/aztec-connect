import { JoinSplitProver, JoinSplitVerifier } from './index';
import { Schnorr } from '../../crypto/schnorr';
import createDebug from 'debug';
import { BarretenbergWasm } from '../../wasm';
import { JoinSplitTx } from './join_split_tx';
import { MerkleTree } from '../../merkle_tree';
import levelup from 'levelup';
import memdown from 'memdown';
import { Blake2s } from '../../crypto/blake2s';
import { Pedersen } from '../../crypto/pedersen';
import { Note, createNoteSecret } from '../note';
import { EventEmitter } from 'events';
import { Crs } from '../../crs';
import { WorkerPool } from '../../wasm/worker_pool';
import { PooledPippenger } from '../../pippenger';
import { PooledFft } from '../../fft';
import { Prover } from '../prover';
import { JoinSplitProof } from './join_split_proof';
import { computeNullifier } from './compute_nullifier';
import { randomBytes } from 'crypto';

const debug = createDebug('bb:join_split_proof');

jest.setTimeout(120000);

describe('join_split_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let joinSplitProver!: JoinSplitProver;
  let joinSplitVerifier!: JoinSplitVerifier;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  let schnorr!: Schnorr;
  let crs!: Crs;
  let pippenger!: PooledPippenger;

  // prettier-ignore
  const privateKey = Buffer.from([
    0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
    0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);

  beforeAll(async () => {
    EventEmitter.defaultMaxListeners = 32;
    const circuitSize = 128 * 1024;

    crs = new Crs(circuitSize);
    await crs.download();

    barretenberg = await BarretenbergWasm.new();

    pool = new WorkerPool();
    await pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8));

    pippenger = new PooledPippenger();
    await pippenger.init(crs.getData(), pool);

    const fft = new PooledFft(pool);
    await fft.init(circuitSize);

    const prover = new Prover(pool.workers[0], pippenger, fft);

    joinSplitProver = new JoinSplitProver(barretenberg, prover);
    joinSplitVerifier = new JoinSplitVerifier();
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    schnorr = new Schnorr(barretenberg);
  });

  afterAll(async () => {
    await pool.destroy();
  });

  it('should decrypt note', () => {
    const pubKey = schnorr.computePublicKey(privateKey);
    const secret = randomBytes(32);
    const note = new Note(pubKey, secret, 100);
    const encryptedNote = joinSplitProver.encryptNote(note);
    const { success, value } = joinSplitProver.decryptNote(encryptedNote, privateKey, secret);
    expect(success).toBe(true);
    expect(value).toBe(100);
  });

  it('should not decrypt note', () => {
    const pubKey = schnorr.computePublicKey(privateKey);
    const secret = randomBytes(32);
    const note = new Note(pubKey, secret, 2000);
    const encryptedNote = joinSplitProver.encryptNote(note);
    const { success, value } = joinSplitProver.decryptNote(encryptedNote, privateKey, secret);
    expect(success).toBe(false);
  });

  describe('join_split_proof_generation', () => {
    beforeAll(async () => {
      debug('creating keys...');
      const start = new Date().getTime();
      await joinSplitProver.computeKey();
      await joinSplitVerifier.computeKey(pippenger.pool[0], crs.getG2Data());
      debug(`created circuit keys: ${new Date().getTime() - start}ms`);
    });

    it('should get key data', async () => {
      const provingKey = await joinSplitProver.getKey();
      expect(provingKey.length).toBeGreaterThan(0);

      const verificationKey = await joinSplitVerifier.getKey();
      expect(verificationKey.length).toBeGreaterThan(0);
    });

    it('should construct join split proof', async () => {
      const pubKey = schnorr.computePublicKey(privateKey);
      const inputNote1 = new Note(pubKey, createNoteSecret(), 100);
      const inputNote2 = new Note(pubKey, createNoteSecret(), 50);
      const outputNote1 = new Note(pubKey, randomBytes(32), 70);
      const outputNote2 = new Note(pubKey, randomBytes(32), 80);

      const inputNote1Enc = await joinSplitProver.encryptNote(inputNote1);
      const inputNote2Enc = await joinSplitProver.encryptNote(inputNote2);
      const tree = new MerkleTree(levelup(memdown()), pedersen, blake2s, 'data', 32);
      await tree.updateElement(0, inputNote1Enc);
      await tree.updateElement(1, inputNote2Enc);

      const inputNote1Path = await tree.getHashPath(0);
      const inputNote2Path = await tree.getHashPath(1);

      const signature = await joinSplitProver.sign4Notes(
        [inputNote1, inputNote2, outputNote1, outputNote2],
        privateKey,
      );

      const tx = new JoinSplitTx(
        pubKey,
        0,
        0,
        2,
        [0, 1],
        tree.getRoot(),
        [inputNote1Path, inputNote2Path],
        [inputNote1, inputNote2],
        [outputNote1, outputNote2],
        signature,
      );

      debug('creating proof...');
      const start = new Date().getTime();
      const proof = await joinSplitProver.createJoinSplitProof(tx);
      debug(`created proof: ${new Date().getTime() - start}ms`);
      debug(`proof size: ${proof.length}`);

      const verified = await joinSplitVerifier.verifyProof(proof);
      expect(verified).toBe(true);

      const joinSplitProof = new JoinSplitProof(proof, []);

      const expectedNullifier1 = computeNullifier(inputNote1Enc, 0, inputNote1.secret, blake2s);
      const expectedNullifier2 = computeNullifier(inputNote2Enc, 1, inputNote2.secret, blake2s);
      expect(joinSplitProof.nullifier1).toEqual(expectedNullifier1);
      expect(joinSplitProof.nullifier2).toEqual(expectedNullifier2);
    });
  });
});

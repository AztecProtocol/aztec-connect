import { JoinSplitProver, JoinSplitVerifier } from './index';
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
import { JoinSplitProof } from './join_split_proof';
import { computeNullifier } from './compute_nullifier';
import { randomBytes } from 'crypto';
import { Grumpkin } from '../../ecc/grumpkin';
import { NoteAlgorithms } from '../note_algorithms';
import { GrumpkinAddress, EthAddress } from '../../address';
import { UnrolledProver } from '../prover';

const debug = createDebug('bb:join_split_proof_test');

jest.setTimeout(120000);

describe('join_split_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let joinSplitProver!: JoinSplitProver;
  let joinSplitVerifier!: JoinSplitVerifier;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  let crs!: Crs;
  let pippenger!: PooledPippenger;
  let grumpkin!: Grumpkin;
  let noteAlgos!: NoteAlgorithms;
  let pubKey!: GrumpkinAddress;

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

    const prover = new UnrolledProver(pool.workers[0], pippenger, fft);

    joinSplitProver = new JoinSplitProver(prover);
    joinSplitVerifier = new JoinSplitVerifier();
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    grumpkin = new Grumpkin(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);

    pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
  });

  afterAll(async () => {
    await pool.destroy();
  });

  it('should decrypt note', () => {
    const secret = randomBytes(32);
    const note = new Note(pubKey, secret, BigInt(100));
    const encryptedNote = noteAlgos.encryptNote(note);
    const { success, value } = noteAlgos.decryptNote(encryptedNote, privateKey, secret);
    expect(success).toBe(true);
    expect(value).toBe(BigInt(100));
  });

  it('should not decrypt note', () => {
    const secret = randomBytes(32);
    const note = new Note(pubKey, secret, BigInt(2000));
    const encryptedNote = noteAlgos.encryptNote(note);
    const { success } = noteAlgos.decryptNote(encryptedNote, privateKey, secret);
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
      const inputNote1 = new Note(pubKey, createNoteSecret(), BigInt(100));
      const inputNote2 = new Note(pubKey, createNoteSecret(), BigInt(50));
      const outputNote1 = new Note(pubKey, createNoteSecret(), BigInt(80));
      const outputNote2 = new Note(pubKey, createNoteSecret(), BigInt(70));

      const inputNote1Enc = await noteAlgos.encryptNote(inputNote1);
      const inputNote2Enc = await noteAlgos.encryptNote(inputNote2);

      const tree = new MerkleTree(levelup(memdown()), pedersen, blake2s, 'data', 32);
      await tree.updateElement(0, inputNote1Enc);
      await tree.updateElement(1, inputNote2Enc);

      const inputNote1Path = await tree.getHashPath(0);
      const inputNote2Path = await tree.getHashPath(1);
      const accountNotePath = await tree.getHashPath(2);

      const signature = await noteAlgos.sign4Notes([inputNote1, inputNote2, outputNote1, outputNote2], privateKey);

      const inputOwner = EthAddress.randomAddress();
      const outputOwner = EthAddress.randomAddress();

      const tx = new JoinSplitTx(
        BigInt(0),
        BigInt(0),
        2,
        [0, 1],
        tree.getRoot(),
        [inputNote1Path, inputNote2Path],
        [inputNote1, inputNote2],
        [outputNote1, outputNote2],
        signature,
        inputOwner,
        outputOwner,
        2,
        accountNotePath,
        pubKey,
      );

      debug('creating proof...');
      const start = new Date().getTime();
      const proof = await joinSplitProver.createProof(tx);
      debug(`created proof: ${new Date().getTime() - start}ms`);
      debug(`proof size: ${proof.length}`);

      const verified = await joinSplitVerifier.verifyProof(proof);
      expect(verified).toBe(true);

      const joinSplitProof = new JoinSplitProof(proof, []);

      const expectedNullifier1 = computeNullifier(inputNote1Enc, 0, inputNote1.secret, blake2s);
      const expectedNullifier2 = computeNullifier(inputNote2Enc, 1, inputNote2.secret, blake2s);
      expect(joinSplitProof.nullifier1).toEqual(expectedNullifier1);
      expect(joinSplitProof.nullifier2).toEqual(expectedNullifier2);
      expect(joinSplitProof.inputOwner).toEqual(inputOwner.toBuffer());
      expect(joinSplitProof.outputOwner).toEqual(outputOwner.toBuffer());
    });
  });
});

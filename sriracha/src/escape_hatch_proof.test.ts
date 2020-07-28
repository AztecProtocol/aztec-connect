// import { SrirachaProvider } from './SrirachaProvider';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { EscapeHatchProof } from 'barretenberg/client_proofs/escape_hatch_proof';
import { EscapeHatchTx } from 'barretenberg/client_proofs/escape_hatch_proof';
import { EscapeHatchProver, EscapeHatchVerifier } from 'barretenberg/client_proofs/escape_hatch_proof';
import { computeNullifier } from 'barretenberg/client_proofs/escape_hatch_proof/compute_nullifier';
import { nullifierBufferToIndex } from 'barretenberg/client_proofs/join_split_proof';
import { createNoteSecret, Note } from 'barretenberg/client_proofs/note';
import { Prover } from 'barretenberg/client_proofs/prover';
import { Crs } from 'barretenberg/crs';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { PooledFft } from 'barretenberg/fft';
import { MerkleTree } from 'barretenberg/merkle_tree';
import { PooledPippenger } from 'barretenberg/pippenger';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { WorkerPool } from 'barretenberg/wasm/worker_pool';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import levelup from 'levelup';
import memdown from 'memdown';
import { appFactory } from './api';
import { SrirachaProvider } from './provider';
import Server from './server';
import { WorldStateDb } from './world_state_db';

const debug = createDebug('bb:escape_hatch_proof');

jest.setTimeout(700000);

// TODO: ultimately this needs to go in barretenberg.js
describe('escape_hatch_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let escapeHatchProver!: EscapeHatchProver;
  let escapeHatchVerifier!: EscapeHatchVerifier;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  let schnorr!: Schnorr;
  let crs!: Crs;
  let grumpkin!: Grumpkin;
  let pippenger!: PooledPippenger;
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
    await pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 1));

    pippenger = new PooledPippenger();
    await pippenger.init(crs.getData(), pool);

    const fft = new PooledFft(pool);
    await fft.init(circuitSize);

    const prover = new Prover(pool.workers[0], pippenger, fft);

    escapeHatchProver = new EscapeHatchProver(barretenberg, prover);
    escapeHatchVerifier = new EscapeHatchVerifier();
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    schnorr = new Schnorr(barretenberg);
    grumpkin = new Grumpkin(barretenberg);

    pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
  });

  afterAll(async () => {
    await pool.destroy();
  });

  it('escape hatch should decrypt note', () => {
    const secret = randomBytes(32);
    const note = new Note(pubKey, secret, BigInt(100));
    const encryptedNote = escapeHatchProver.encryptNote(note);
    const { success, value } = escapeHatchProver.decryptNote(encryptedNote, privateKey, secret);
    expect(success).toBe(true);
    expect(value).toBe(BigInt(100));
  });

  it('escape hatch should not decrypt note', () => {
    const secret = randomBytes(32);
    const note = new Note(pubKey, secret, BigInt(2000));
    const encryptedNote = escapeHatchProver.encryptNote(note);
    const { success } = escapeHatchProver.decryptNote(encryptedNote, privateKey, secret);
    expect(success).toBe(false);
  });

  describe('escape_hatch_proof_generation', () => {
    const srirachaURL = 'http://localhost:90';
    let sriracha!: SrirachaProvider;

    beforeAll(async () => {
      debug('creating keys...');
      const start = new Date().getTime();
      debug(`created circuit keys: ${new Date().getTime() - start}ms`);

      const server = new Server(new WorldStateDb());

      await server.start();
      const app = appFactory(server, '/api');
      const api = app.listen(8080);
      sriracha = new SrirachaProvider(srirachaURL, api);
    });

    it('should pass', async () => {
      await escapeHatchProver.computeKey();
      expect(true).toBe(true);
    });

    it('should create a proof', async () => {
      const inputNote1 = new Note(pubKey, createNoteSecret(), BigInt(100));
      const inputNote2 = new Note(pubKey, createNoteSecret(), BigInt(50));
      const inputNotes = [inputNote1, inputNote2];
      const inputNote1Enc = await escapeHatchProver.encryptNote(inputNote1);
      const inputNote2Enc = await escapeHatchProver.encryptNote(inputNote2);
      const encryptedNotes = [inputNote1Enc, inputNote2Enc];
      const inputIndexes = [0, 1];
      const tree = new MerkleTree(levelup(memdown()), pedersen, blake2s, 'data', 32);
      await tree.updateElement(0, inputNote1Enc);
      await tree.updateElement(1, inputNote2Enc);
      const inputNote1Path = await tree.getHashPath(0);
      const inputNote2Path = await tree.getHashPath(1);
      const nullifiers = encryptedNotes.map((encNote, index) => {
        const nullifier = computeNullifier(encNote, inputIndexes[index], inputNotes[index].secret, blake2s, true);
        return `0x${nullifierBufferToIndex(nullifier).toString(16)}`;
      });

      const signature = await escapeHatchProver.sign2Notes([inputNote1, inputNote2], privateKey);
      const outputOwner = EthAddress.randomAddress();
      const accountIndex = 2;
      const accountNotePath = await tree.getHashPath(2);

      const accountNote = new Note(pubKey, createNoteSecret(), BigInt(0));
      const accountNoteEnc = await escapeHatchProver.encryptNote(accountNote);

      const accountNullifier = computeNullifier(accountNoteEnc, accountIndex, accountNote.secret, blake2s, true);
      const accountNullifierIndex = nullifierBufferToIndex(accountNullifier);
      const accountNullifierPath = await sriracha.getAccountNullifierPath(`0x${accountNullifierIndex.toString(16)}`);
      const {
        newNullifierRoots,
        nullifierMerkleRoot,
        currentNullifierPaths,
        newNullifierPaths,
      } = await sriracha.getNullifierPaths(nullifiers);

      // todo: what should these values be?
      const oldDataRootsRoot = tree.getRoot();
      const newDataRootsRoot = tree.getRoot();
      const oldDataRoot = tree.getRoot();
      const newDataRoot = oldDataRoot; // same as old, no notes being added

      const tx = new EscapeHatchTx(
        BigInt(150),
        2,
        inputIndexes,
        oldDataRoot,
        [inputNote1Path, inputNote2Path],
        [inputNote1, inputNote2],
        signature,
        outputOwner,
        accountIndex,
        accountNotePath,
        accountNullifierPath,
        pubKey,
        nullifierMerkleRoot,
        newNullifierRoots,
        currentNullifierPaths,
        newNullifierPaths,
        newDataRoot,
        oldDataRootsRoot,
        newDataRootsRoot,
      );
      await escapeHatchProver.computeKey();

      debug('creating proof...');
      const start = new Date().getTime();
      const proof = await escapeHatchProver.createEscapeHatchProof(tx);
      debug(`created proof: ${new Date().getTime() - start}ms`);
      debug(`proof size: ${proof.length}`);

      await escapeHatchVerifier.computeKey(pippenger.pool[0], crs.getG2Data());
      debug('verifiying proof');
      const verified = await escapeHatchVerifier.verifyProof(proof);
      debug('finished verification attempt');
      expect(verified).toBe(true);
      const escapeHatchProof = new EscapeHatchProof(proof);
      expect(escapeHatchProof.oldDataRoot).toEqual(oldDataRoot);
      expect(escapeHatchProof.newDataRoot).toEqual(newDataRoot);
      expect(escapeHatchProof.oldNullRoot).toEqual(nullifierMerkleRoot);
      expect(escapeHatchProof.newNullRoot).toEqual(newNullifierRoots[1]); // latest nullifier root
      expect(escapeHatchProof.oldDataRootsRoot).toEqual(oldDataRootsRoot); // latest nullifier root
      expect(escapeHatchProof.newDataRootsRoot).toEqual(newDataRootsRoot); // latest nullifier root
      expect(escapeHatchProof.outputOwner).toEqual(outputOwner);
    });
  });
});

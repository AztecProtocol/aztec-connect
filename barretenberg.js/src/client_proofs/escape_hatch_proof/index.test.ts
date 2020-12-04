import { EscapeHatchProver, EscapeHatchTx, EscapeHatchVerifier } from './index';
import createDebug from 'debug';
import { BarretenbergWasm } from '../../wasm';
import { createNoteSecret, Note } from '../note';
import { EventEmitter } from 'events';
import { Crs } from '../../crs';
import { WorkerPool } from '../../wasm/worker_pool';
import { Pedersen } from '../../crypto/pedersen';
import { Schnorr } from '../../crypto/schnorr';
import { PooledPippenger } from '../../pippenger';
import { PooledFft } from '../../fft';
import { Prover } from '../prover';
import { Grumpkin } from '../../ecc/grumpkin';
import { EthAddress, GrumpkinAddress } from '../../address';
import { HashPath } from '../../merkle_tree';
import { JoinSplitTx } from '../join_split_proof';
import { WorldStateDb } from '../../world_state_db';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { NoteAlgorithms } from '../note_algorithms';
import { RollupProofData } from '../../rollup_proof';
import { Blake2s } from '../../crypto/blake2s';
import { AccountId } from '../account_id';
import { AliasHash } from '../alias_hash';
import { computeSigningData } from '../join_split_proof/compute_signing_data';

const debug = createDebug('bb:escape_hatch_proof');

jest.setTimeout(700000);

describe('escape_hatch_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let escapeHatchProver!: EscapeHatchProver;
  let escapeHatchVerifier!: EscapeHatchVerifier;
  let crs!: Crs;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  let schnorr!: Schnorr;
  let grumpkin!: Grumpkin;
  let pippenger!: PooledPippenger;
  let pubKey!: GrumpkinAddress;
  let noteAlgos!: NoteAlgorithms;

  let worldStateDb!: WorldStateDb;

  const dataTreeId = 0;
  const nullifierTreeId = 1;
  const rootTreeId = 2;

  // prettier-ignore
  const privateKey = Buffer.from([
    0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
    0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);

  beforeEach(async () => {
    EventEmitter.defaultMaxListeners = 32;
    const circuitSize = EscapeHatchProver.circuitSize;

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

    escapeHatchProver = new EscapeHatchProver(prover);
    escapeHatchVerifier = new EscapeHatchVerifier();
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    schnorr = new Schnorr(barretenberg);
    grumpkin = new Grumpkin(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);

    pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));

    worldStateDb = new WorldStateDb('/tmp/world_state_eh.db');
    worldStateDb.destroy();
    await worldStateDb.start();
  });

  afterEach(async () => {
    worldStateDb.stop();
    worldStateDb.destroy();
    await pool.destroy();
  });

  it('should construct and verify an escape hatch proof', async () => {
    const inputNote1 = new Note(pubKey, createNoteSecret(), BigInt(100), 0, 0);
    const inputNote2 = new Note(pubKey, createNoteSecret(), BigInt(50), 0, 0);
    const inputNotes = [inputNote1, inputNote2];

    const inputIndexes = [0, 1];
    const inputNote1Enc = await noteAlgos.encryptNote(inputNote1);
    const inputNote2Enc = await noteAlgos.encryptNote(inputNote2);
    const encryptedNotes = [inputNote1Enc, inputNote2Enc];
    const nullifiers = encryptedNotes.map((encNote, index) => {
      return toBigIntBE(noteAlgos.computeNoteNullifier(encNote, inputIndexes[index], privateKey, true));
    });

    const outputNote1 = new Note(pubKey, createNoteSecret(), BigInt(20), 0, 0);
    const outputNote2 = new Note(pubKey, createNoteSecret(), BigInt(10), 0, 0);
    const outputNotes = [outputNote1, outputNote2];

    // Setup state, simulate inputs notes already being in
    await worldStateDb.put(dataTreeId, BigInt(inputIndexes[0]), inputNote1Enc);
    await worldStateDb.put(dataTreeId, BigInt(inputIndexes[1]), inputNote2Enc);

    const inputNote1Path = await worldStateDb.getHashPath(dataTreeId, BigInt(inputIndexes[0]));
    const inputNote2Path = await worldStateDb.getHashPath(dataTreeId, BigInt(inputIndexes[1]));

    // Get starting info - oldDataRoot, dataStartIndex, oldDataPath
    const oldDataRoot = await worldStateDb.getRoot(dataTreeId);
    const dataStartIndex = worldStateDb.getSize(dataTreeId);
    const oldDataPath = await worldStateDb.getHashPath(dataTreeId, dataStartIndex);

    // Add the output notes to the tree
    let nextDataStartIndex = worldStateDb.getSize(dataTreeId);
    const outputNote1Enc = await noteAlgos.encryptNote(outputNote1);
    const outputNote2Enc = await noteAlgos.encryptNote(outputNote2);

    await worldStateDb.put(dataTreeId, nextDataStartIndex++, outputNote1Enc);
    await worldStateDb.put(dataTreeId, nextDataStartIndex++, outputNote2Enc);

    // Get the newDataPath and newDataRoot now that output notes have been added
    const newDataPath = await worldStateDb.getHashPath(dataTreeId, BigInt(dataStartIndex));
    const newDataRoot = await worldStateDb.getRoot(dataTreeId);

    const inputOwner = EthAddress.randomAddress();
    const outputOwner = EthAddress.randomAddress();

    const sigMsg = computeSigningData(
        [inputNote1, inputNote2, outputNote1, outputNote2],
        0,
        1,
        inputOwner,
        outputOwner,
        BigInt(0),
        BigInt(120),
        0,
        2,
        privateKey,
        pedersen,
        noteAlgos,
      );
    const signature = schnorr.constructSignature(sigMsg, privateKey);

    const aliasHash = AliasHash.fromAlias('user_zero', blake2s);
    const nonce = 0;
    const accountId = new AccountId(aliasHash, nonce);

    const accountIndex = 0;
    const accountNotePath = await worldStateDb.getHashPath(dataTreeId, BigInt(accountIndex));

    // Get value note nullifier data
    const oldNullifierRoot = worldStateDb.getRoot(nullifierTreeId);
    const oldNullifierPaths: HashPath[] = [];
    const newNullifierPaths: HashPath[] = [];
    const newNullifierRoots: Buffer[] = [];
    for (const nullifier of nullifiers) {
      const oldHashPath = await worldStateDb.getHashPath(nullifierTreeId, nullifier);
      oldNullifierPaths.push(oldHashPath);
      await worldStateDb.put(nullifierTreeId, nullifier, toBufferBE(BigInt(1), 64));
      const newHashPath = await worldStateDb.getHashPath(nullifierTreeId, nullifier);
      newNullifierPaths.push(newHashPath);
      newNullifierRoots.push(worldStateDb.getRoot(nullifierTreeId));
    }

    // Get root tree data
    const oldDataRootsRoot = worldStateDb.getRoot(rootTreeId);
    const rootTreeSize = worldStateDb.getSize(rootTreeId);
    const oldDataRootsPath = await worldStateDb.getHashPath(rootTreeId, rootTreeSize);
    await worldStateDb.put(rootTreeId, rootTreeSize, newDataRoot);
    const newDataRootsRoot = worldStateDb.getRoot(rootTreeId);
    const newDataRootsPath = await worldStateDb.getHashPath(rootTreeId, rootTreeSize);
    const rollupId = 0;

    const joinSplitTx = new JoinSplitTx(
      BigInt(0),
      BigInt(120),
      0,
      2,
      inputIndexes,
      oldDataRoot,
      [inputNote1Path, inputNote2Path],
      inputNotes,
      outputNotes,
      privateKey,
      accountId,
      accountIndex,
      accountNotePath,
      pubKey,
      signature,
      inputOwner,
      outputOwner,
    );

    const tx = new EscapeHatchTx(
      joinSplitTx,
      rollupId,
      Number(dataStartIndex),
      newDataRoot,
      oldDataPath,
      newDataPath,

      oldNullifierRoot,
      newNullifierRoots,
      oldNullifierPaths,
      newNullifierPaths,

      oldDataRootsRoot,
      newDataRootsRoot,
      oldDataRootsPath,
      newDataRootsPath,
    );
    await escapeHatchProver.computeKey();
    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await escapeHatchProver.createProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);
    await escapeHatchVerifier.computeKey(pippenger.pool[0], crs.getG2Data());
    const verified = await escapeHatchVerifier.verifyProof(proof);
    expect(verified).toBe(true);

    const escapeHatchProof = RollupProofData.fromBuffer(proof);
    expect(escapeHatchProof.rollupId).toEqual(rollupId);
    expect(escapeHatchProof.rollupSize).toEqual(0);
    expect(escapeHatchProof.dataStartIndex).toEqual(2);
    expect(escapeHatchProof.oldDataRoot).toEqual(oldDataRoot);
    expect(escapeHatchProof.newDataRoot).toEqual(newDataRoot);
    expect(escapeHatchProof.oldNullRoot).toEqual(oldNullifierRoot);
    expect(escapeHatchProof.newNullRoot).toEqual(newNullifierRoots[1]); // TODO
    expect(escapeHatchProof.oldDataRootsRoot).toEqual(oldDataRootsRoot);
    expect(escapeHatchProof.newDataRootsRoot).toEqual(newDataRootsRoot);
    expect(escapeHatchProof.numTxs).toEqual(1);
  });
});

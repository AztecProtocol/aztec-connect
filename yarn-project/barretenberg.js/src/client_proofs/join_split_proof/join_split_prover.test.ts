import createDebug from 'debug';
import { EventEmitter } from 'events';
import { default as levelup } from 'levelup';
import { default as memdown } from 'memdown';
import { AliasHash } from '../../account_id/index.js';
import { EthAddress, GrumpkinAddress } from '../../address/index.js';
import { Crs } from '../../crs/index.js';
import { Blake2s, PooledPedersen, Schnorr, Sha256, SinglePedersen } from '../../crypto/index.js';
import { Grumpkin } from '../../ecc/index.js';
import { PooledFft, SingleFft } from '../../fft/index.js';
import { MerkleTree } from '../../merkle_tree/index.js';
import { ClaimNoteTxData, NoteAlgorithms, TreeNote } from '../../note_algorithms/index.js';
import { PooledPippenger, SinglePippenger } from '../../pippenger/index.js';
import { numToUInt32BE } from '../../serialize/index.js';
import { BarretenbergWasm, WorkerPool } from '../../wasm/index.js';
import { JoinSplitProofData, ProofData, ProofId } from '../proof_data/index.js';
import { UnrolledProver } from '../prover/index.js';
import { JoinSplitProver } from './join_split_prover.js';
import { JoinSplitTx } from './join_split_tx.js';
import { JoinSplitVerifier } from './join_split_verifier.js';
import { jest } from '@jest/globals';

const debug = createDebug('bb:join_split_proof_test');

jest.setTimeout(120000);

describe('join_split_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let joinSplitVerifier!: JoinSplitVerifier;
  let sha256!: Sha256;
  let blake2s!: Blake2s;
  let schnorr!: Schnorr;
  let crs!: Crs;
  let grumpkin!: Grumpkin;
  let noteAlgos!: NoteAlgorithms;
  let pubKey!: GrumpkinAddress;
  let tree!: MerkleTree;

  // prettier-ignore
  const privateKey = Buffer.from([
    0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
    0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb]);

  const createEphemeralPrivKey = (grumpkin: Grumpkin) => grumpkin.getRandomFr();

  beforeAll(async () => {
    EventEmitter.defaultMaxListeners = 32;

    // Assume no larger than 64k gates.
    crs = new Crs(64 * 1024);
    await crs.download();

    barretenberg = await BarretenbergWasm.new();

    sha256 = new Sha256(barretenberg);
    blake2s = new Blake2s(barretenberg);
    schnorr = new Schnorr(barretenberg);
    grumpkin = new Grumpkin(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);
    joinSplitVerifier = new JoinSplitVerifier();

    pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
  });

  const createAndCheckProof = async (joinSplitProver: JoinSplitProver) => {
    const publicAssetId = 0;
    const publicValue = BigInt(0);
    const publicOwner = EthAddress.ZERO;
    const assetId = 1;
    const txFee = BigInt(20);
    const accountRequired = false;

    const inputNote1EphKey = createEphemeralPrivKey(grumpkin);
    const inputNote2EphKey = createEphemeralPrivKey(grumpkin);
    const outputNote1EphKey = createEphemeralPrivKey(grumpkin);
    const outputNote2EphKey = createEphemeralPrivKey(grumpkin);

    const inputNoteNullifier1 = numToUInt32BE(1, 32);
    const inputNoteNullifier2 = numToUInt32BE(2, 32);

    const inputNote1 = TreeNote.createFromEphPriv(
      pubKey,
      BigInt(100),
      assetId,
      accountRequired,
      inputNoteNullifier1,
      inputNote1EphKey,
      grumpkin,
    );
    const inputNote2 = TreeNote.createFromEphPriv(
      pubKey,
      BigInt(50),
      assetId,
      accountRequired,
      inputNoteNullifier2,
      inputNote2EphKey,
      grumpkin,
    );

    const inputNote1Enc = noteAlgos.valueNoteCommitment(inputNote1);
    const inputNote2Enc = noteAlgos.valueNoteCommitment(inputNote2);

    const expectedNullifier1 = noteAlgos.valueNoteNullifier(inputNote1Enc, privateKey);
    const expectedNullifier2 = noteAlgos.valueNoteNullifier(inputNote2Enc, privateKey);

    const outputNote1 = TreeNote.createFromEphPriv(
      pubKey,
      BigInt(80),
      assetId,
      true,
      expectedNullifier1,
      outputNote1EphKey,
      grumpkin,
    );
    const outputNote2 = TreeNote.createFromEphPriv(
      pubKey,
      BigInt(50),
      assetId,
      false,
      expectedNullifier2,
      outputNote2EphKey,
      grumpkin,
    );

    await tree.updateElement(0, inputNote1Enc);
    await tree.updateElement(1, inputNote2Enc);

    const inputNote1Path = await tree.getHashPath(0);
    const inputNote2Path = await tree.getHashPath(1);
    const accountNotePath = await tree.getHashPath(2);
    const aliasHash = AliasHash.fromAlias('user_zero', blake2s);

    const numInputNotes = 2;
    const tx = new JoinSplitTx(
      ProofId.SEND,
      publicValue,
      publicOwner,
      assetId,
      numInputNotes,
      [0, 1],
      tree.getRoot(),
      [inputNote1Path, inputNote2Path],
      [inputNote1, inputNote2],
      [outputNote1, outputNote2],
      ClaimNoteTxData.EMPTY,
      privateKey,
      aliasHash,
      accountRequired,
      2,
      accountNotePath,
      pubKey,
      Buffer.alloc(32),
      0,
    );
    const signingData = await joinSplitProver.computeSigningData(tx);
    const signature = schnorr.constructSignature(signingData, privateKey);

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await joinSplitProver.createProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    if (!joinSplitProver.mock) {
      const verified = await joinSplitVerifier.verifyProof(proof);
      expect(verified).toBe(true);
    }

    const proofData = new ProofData(proof);
    const joinSplitProofData = new JoinSplitProofData(proofData);
    const noteCommitment1 = noteAlgos.valueNoteCommitment(outputNote1);
    const noteCommitment2 = noteAlgos.valueNoteCommitment(outputNote2);
    expect(proofData.proofId).toEqual(ProofId.SEND);
    expect(proofData.noteCommitment1).toEqual(noteCommitment1);
    expect(proofData.noteCommitment2).toEqual(noteCommitment2);
    expect(proofData.nullifier1).toEqual(expectedNullifier1);
    expect(proofData.nullifier2).toEqual(expectedNullifier2);
    expect(joinSplitProofData.publicValue).toEqual(publicValue);
    expect(joinSplitProofData.publicOwner).toEqual(publicOwner);
    expect(joinSplitProofData.publicAssetId).toEqual(publicAssetId);
    expect(proofData.noteTreeRoot).toEqual(tree.getRoot());
    expect(joinSplitProofData.txFee).toEqual(txFee);
    expect(joinSplitProofData.txFeeAssetId).toEqual(assetId);
    expect(proofData.bridgeCallData).toEqual(Buffer.alloc(32));
    expect(proofData.defiDepositValue).toEqual(Buffer.alloc(32));
    expect(proofData.defiRoot).toEqual(Buffer.alloc(32));
    expect(proofData.backwardLink).toEqual(Buffer.alloc(32));
    expect(proofData.allowChain).toEqual(Buffer.alloc(32));
  };

  describe('join_split_mock_proof_generation_no_worker', () => {
    let fft!: SingleFft;
    let pippenger!: SinglePippenger;
    let joinSplitProver!: JoinSplitProver;

    beforeAll(async () => {
      pippenger = new SinglePippenger(barretenberg);
      await pippenger.init(crs.getData());

      const pedersen = new SinglePedersen(barretenberg);
      await pedersen.init();

      // Mock circuits are tiny with 512 gates.
      fft = new SingleFft(barretenberg);
      await fft.init(512);

      tree = new MerkleTree(levelup(memdown()), pedersen, 'data', 32);

      const prover = new UnrolledProver(barretenberg, pippenger, fft);
      joinSplitProver = new JoinSplitProver(prover, true);

      debug('creating keys...');
      const start = new Date().getTime();
      await joinSplitProver.computeKey();
      await joinSplitVerifier.computeKey(pippenger, crs.getG2Data());
      debug(`created circuit keys: ${new Date().getTime() - start}ms`);
      debug(`vk hash: ${sha256.hash(await joinSplitVerifier.getKey()).toString('hex')}`);
    });

    afterAll(async () => {
      await fft.destroy();
      await pippenger.destroy();
    });

    it('should construct mock join split proof', async () => {
      await createAndCheckProof(joinSplitProver);
    });
  });

  describe('join_split_proof_generation_pooled_workers', () => {
    let pool!: WorkerPool;
    let pippenger!: PooledPippenger;
    let fft!: PooledFft;
    let joinSplitProver!: JoinSplitProver;

    beforeAll(async () => {
      pool = new WorkerPool();
      // Set max memory to 1gb (16384 pages) as verification key generation uses loads of mem.
      await pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8), 16384);

      pippenger = new PooledPippenger(pool);
      await pippenger.init(crs.getData());

      const pedersen = new PooledPedersen(barretenberg, pool);
      await pedersen.init();

      fft = new PooledFft(pool);
      await fft.init(JoinSplitProver.getCircuitSize());

      tree = new MerkleTree(levelup(memdown()), pedersen, 'data', 32);

      const prover = new UnrolledProver(pool.workers[0], pippenger, fft);
      joinSplitProver = new JoinSplitProver(prover, false);

      debug('creating keys...');
      const start = new Date().getTime();
      await joinSplitProver.computeKey();
      await joinSplitVerifier.computeKey(pippenger.pool[0], crs.getG2Data());
      debug(`created circuit keys: ${new Date().getTime() - start}ms`);
      debug(`vk hash: ${sha256.hash(await joinSplitVerifier.getKey()).toString('hex')}`);
    });

    afterAll(async () => {
      await fft.destroy();
      await pippenger.destroy();
      await pool.destroy();
    });

    it('should get key data', async () => {
      const provingKey = await joinSplitProver.getKey();
      expect(provingKey.length).toBeGreaterThan(0);

      const verificationKey = await joinSplitVerifier.getKey();
      expect(verificationKey.length).toBeGreaterThan(0);
    });

    it('should construct join split proof', async () => {
      await createAndCheckProof(joinSplitProver);
    });
  });
});

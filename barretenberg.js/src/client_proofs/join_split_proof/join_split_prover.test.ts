import createDebug from 'debug';
import { EventEmitter } from 'events';
import levelup from 'levelup';
import memdown from 'memdown';
import { AccountAliasId } from '../../account_id';
import { EthAddress, GrumpkinAddress } from '../../address';
import { toBufferBE } from '../../bigint_buffer';
import { Crs } from '../../crs';
import { Blake2s, Pedersen, Schnorr, Sha256 } from '../../crypto';
import { Grumpkin } from '../../ecc';
import { PooledFft } from '../../fft';
import { MerkleTree } from '../../merkle_tree';
import { ClaimNoteTxData, NoteAlgorithms, TreeNote } from '../../note_algorithms';
import { PooledPippenger } from '../../pippenger';
import { numToUInt32BE } from '../../serialize';
import { BarretenbergWasm } from '../../wasm';
import { WorkerPool } from '../../wasm/worker_pool';
import { ProofData, ProofId } from '../proof_data';
import { UnrolledProver } from '../prover';
import { JoinSplitProver } from './join_split_prover';
import { JoinSplitTx } from './join_split_tx';
import { JoinSplitVerifier } from './join_split_verifier';

const debug = createDebug('bb:join_split_proof_test');

jest.setTimeout(120000);

describe('join_split_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let joinSplitProver!: JoinSplitProver;
  let joinSplitVerifier!: JoinSplitVerifier;
  let sha256!: Sha256;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  let schnorr!: Schnorr;
  let crs!: Crs;
  let pippenger!: PooledPippenger;
  let grumpkin!: Grumpkin;
  let noteAlgos!: NoteAlgorithms;
  let pubKey!: GrumpkinAddress;

  // prettier-ignore
  const privateKey = Buffer.from([
    0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
    0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb]);

  const createEphemeralPrivKey = (grumpkin: Grumpkin) => grumpkin.getRandomFr();

  beforeAll(async () => {
    EventEmitter.defaultMaxListeners = 32;
    const circuitSize = JoinSplitProver.circuitSize;

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

    sha256 = new Sha256(barretenberg);
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    schnorr = new Schnorr(barretenberg);
    grumpkin = new Grumpkin(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);
    joinSplitProver = new JoinSplitProver(prover);
    joinSplitVerifier = new JoinSplitVerifier();

    pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
  });

  afterAll(async () => {
    await pool.destroy();
  });

  describe('join_split_proof_generation', () => {
    beforeAll(async () => {
      debug('creating keys...');
      const start = new Date().getTime();
      await joinSplitProver.computeKey();
      await joinSplitVerifier.computeKey(pippenger.pool[0], crs.getG2Data());
      debug(`created circuit keys: ${new Date().getTime() - start}ms`);
      debug(`vk hash: ${sha256.hash(await joinSplitVerifier.getKey()).toString('hex')}`);
    });

    it('should get key data', async () => {
      const provingKey = await joinSplitProver.getKey();
      expect(provingKey.length).toBeGreaterThan(0);

      const verificationKey = await joinSplitVerifier.getKey();
      expect(verificationKey.length).toBeGreaterThan(0);
    });

    it('should construct join split proof', async () => {
      const assetId = 1;
      const publicInput = BigInt(20);
      const publicOutput = BigInt(0);
      const txFee = BigInt(20);
      const publicOwner = EthAddress.randomAddress();

      const inputNote1EphKey = createEphemeralPrivKey(grumpkin);
      const inputNote2EphKey = createEphemeralPrivKey(grumpkin);
      const outputNote1EphKey = createEphemeralPrivKey(grumpkin);
      const outputNote2EphKey = createEphemeralPrivKey(grumpkin);

      const inputNoteNullifier1 = numToUInt32BE(1, 32);
      const inputNoteNullifier2 = numToUInt32BE(2, 32);

      const inputNote1 = TreeNote.createFromEphPriv(
        pubKey,
        BigInt(100),
        1,
        0,
        inputNoteNullifier1,
        inputNote1EphKey,
        grumpkin,
      );
      const inputNote2 = TreeNote.createFromEphPriv(
        pubKey,
        BigInt(50),
        1,
        0,
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
        1,
        0,
        expectedNullifier1,
        outputNote1EphKey,
        grumpkin,
      );
      const outputNote2 = TreeNote.createFromEphPriv(
        pubKey,
        BigInt(70),
        1,
        0,
        expectedNullifier2,
        outputNote2EphKey,
        grumpkin,
      );

      const tree = new MerkleTree(levelup(memdown()), pedersen, 'data', 32);
      await tree.updateElement(0, inputNote1Enc);
      await tree.updateElement(1, inputNote2Enc);

      const inputNote1Path = await tree.getHashPath(0);
      const inputNote2Path = await tree.getHashPath(1);
      const accountNotePath = await tree.getHashPath(2);

      const nonce = 0;
      const accountAliasId = AccountAliasId.fromAlias('user_zero', nonce, blake2s);

      const numInputNotes = 2;
      const tx = new JoinSplitTx(
        publicInput,
        publicOutput,
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
        accountAliasId,
        2,
        accountNotePath,
        pubKey,
        0,
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

      const verified = await joinSplitVerifier.verifyProof(proof);
      expect(verified).toBe(true);

      const joinSplitProof = new ProofData(proof);
      const noteCommitment1 = noteAlgos.valueNoteCommitment(outputNote1);
      const noteCommitment2 = noteAlgos.valueNoteCommitment(outputNote2);
      expect(joinSplitProof.proofId).toEqual(ProofId.DEPOSIT);
      expect(joinSplitProof.noteCommitment1).toEqual(noteCommitment1);
      expect(joinSplitProof.noteCommitment2).toEqual(noteCommitment2);
      expect(joinSplitProof.nullifier1).toEqual(expectedNullifier1);
      expect(joinSplitProof.nullifier2).toEqual(expectedNullifier2);
      expect(joinSplitProof.publicValue).toEqual(toBufferBE(publicInput, 32));
      expect(joinSplitProof.publicOwner).toEqual(publicOwner.toBuffer32());
      expect(joinSplitProof.assetId).toEqual(numToUInt32BE(assetId, 32));
      expect(joinSplitProof.noteTreeRoot).toEqual(tree.getRoot());
      expect(joinSplitProof.txFee).toEqual(toBufferBE(txFee, 32));
      expect(joinSplitProof.txFeeAssetId).toEqual(numToUInt32BE(assetId, 32));
      expect(joinSplitProof.bridgeId).toEqual(Buffer.alloc(32));
      expect(joinSplitProof.defiDepositValue).toEqual(Buffer.alloc(32));
      expect(joinSplitProof.defiRoot).toEqual(Buffer.alloc(32));
      expect(joinSplitProof.propagatedInputIndex).toEqual(Buffer.alloc(32));
      expect(joinSplitProof.backwardLink).toEqual(Buffer.alloc(32));
      expect(joinSplitProof.allowChain).toEqual(Buffer.alloc(32));
    });
  });
});

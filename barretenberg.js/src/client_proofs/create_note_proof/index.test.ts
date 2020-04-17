import { CreateNoteProver, Note, CreateNoteVerifier } from './index';
import { Schnorr } from '../../crypto/schnorr';
import { WorkerPool } from '../../wasm/worker_pool';
import { Prover } from '../prover';
import { Crs } from '../../crs';
import { PooledPippenger } from '../../pippenger/pooled_pippenger';
import { PooledFft } from '../../fft/pooled_fft';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { BarretenbergWasm } from '../../wasm';

const debug = createDebug('bb:create_proof');

describe('create_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let createNoteProver!: CreateNoteProver;
  let createNoteVerifier!: CreateNoteVerifier;
  let schnorr!: Schnorr;

  beforeAll(async () => {
    EventEmitter.defaultMaxListeners = 32;
    const circuitSize = 32*1024;

    const crs = new Crs(circuitSize);
    await crs.download();

    barretenberg = await BarretenbergWasm.new();

    pool = new WorkerPool();
    await pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8));

    const pippenger = new PooledPippenger();
    await pippenger.init(crs.getData(), pool);

    const fft = new PooledFft(pool);
    await fft.init(circuitSize);

    const prover = new Prover(pool.workers[0], pippenger, fft);

    schnorr = new Schnorr(barretenberg);
    createNoteProver = new CreateNoteProver(pool.workers[0], prover);
    createNoteVerifier = new CreateNoteVerifier(pippenger.pool[0]);

    debug("creating keys...");
    const start = new Date().getTime();
    await createNoteProver.init();
    await createNoteVerifier.init(crs.getG2Data());
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
  }, 60000);

  afterAll(async () => {
    await pool.destroy();
  });

  it('should construct "create note" proof', async () => {
    // prettier-ignore
    const pk = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
      0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);
    // prettier-ignore
    const viewingKey = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

    const pubKey = await schnorr.computePublicKey(pk);
    const note = new Note(pubKey, viewingKey, 100);
    const encryptedNote = await createNoteProver.encryptNote(note);
    const encryptedNoteX = encryptedNote.slice(32, 64);
    const signature = await schnorr.constructSignature(encryptedNoteX, pk);

    expect(await schnorr.verifySignature(encryptedNoteX, pubKey, signature)).toBe(true);

    debug("creating proof...");
    const start = new Date().getTime();
    const proof = await createNoteProver.createNoteProof(note, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const verified = await createNoteVerifier.verifyProof(proof);
    expect(verified).toBe(true);

    debug(`mem: ${await barretenberg.getMemory().length}`);
  }, 60000);
});

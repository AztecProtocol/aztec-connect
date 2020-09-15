import { EscapeHatchProver, EscapeHatchVerifier } from './index';
import { Schnorr } from '../../crypto/schnorr';
import createDebug from 'debug';
import { BarretenbergWasm } from '../../wasm';
import { Blake2s } from '../../crypto/blake2s';
import { Pedersen } from '../../crypto/pedersen';
import { Note } from '../note';
import { EventEmitter } from 'events';
import { Crs } from '../../crs';
import { WorkerPool } from '../../wasm/worker_pool';
import { PooledPippenger } from '../../pippenger';
import { PooledFft } from '../../fft';
import { Prover } from '../prover';
import { randomBytes } from 'crypto';
import { Grumpkin } from '../../ecc/grumpkin';
import { GrumpkinAddress } from '../../address';

const debug = createDebug('bb:escape_hatch_proof');

jest.setTimeout(700000);

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
    const circuitSize = 512 * 1024;

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
    const { success, value } = escapeHatchProver.decryptNote(encryptedNote, privateKey, secret);
    expect(success).toBe(false);
  });

  it('should construct keys', async () => {
    debug('creating keys...');
    const start = new Date().getTime();
    await escapeHatchProver.computeKey(crs);
    await escapeHatchVerifier.computeKey(pippenger.pool[0], crs.getG2Data());
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
  });
});

import { CreateNoteProof, Note } from './index';
import { Schnorr } from '../../crypto/schnorr';
import { BarretenbergWorker } from '../../wasm/worker';
import { fetchCode } from '../../wasm';
import { destroyWorker, createWorker, } from '../../wasm/worker_factory';
import { Prover } from '../prover';
import { Crs } from '../../crs';
import { SinglePippenger } from '../../pippenger';
import { PooledPippenger } from '../../pippenger/pooled_pippenger';
import createDebug from 'debug';

const debug = createDebug('create_proof');

describe('create_proof', () => {
  let barretenberg!: BarretenbergWorker;
  let createProof!: CreateNoteProof;
  let schnorr!: Schnorr;
  let pippenger!: PooledPippenger;

  beforeAll(async () => {
    const code = await fetchCode();

    barretenberg = await createWorker();
    await barretenberg.init(code);

    const crs = new Crs(32*1024);
    await crs.download();

    const keyGenPippenger = new SinglePippenger(barretenberg);
    await keyGenPippenger.init(crs.getData());

    debug("creating workers...");
    let start = new Date().getTime();
    pippenger = new PooledPippenger(barretenberg);
    await pippenger.init(code, crs.getData(), 8);
    debug(`created workers: ${new Date().getTime() - start}ms`);

    const prover = new Prover(barretenberg, crs, pippenger);

    schnorr = new Schnorr(barretenberg);
    createProof = new CreateNoteProof(barretenberg, prover, keyGenPippenger);

    debug("creating keys...");
    start = new Date().getTime();
    await createProof.init();
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
  }, 60000);

  afterAll(async () => {
    await pippenger.destroy();
    await destroyWorker(barretenberg);
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
    const encryptedNote = await createProof.encryptNote(note);
    const encryptedNoteX = encryptedNote.slice(32, 64);
    const signature = await schnorr.constructSignature(encryptedNoteX, pk);

    expect(await schnorr.verifySignature(encryptedNoteX, pubKey, signature)).toBe(true);

    debug("creating proof...");
    const start = new Date().getTime();
    const proof = await createProof.createNoteProof(note, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const verified = await createProof.verifyProof(proof);
    expect(verified).toBe(true);
  }, 60000);
});

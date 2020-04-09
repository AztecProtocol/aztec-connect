import { PooledFft } from 'barretenberg-es/fft';
import { PooledPippenger } from 'barretenberg-es/pippenger';
import { CreateNoteProver, CreateNoteVerifier } from 'barretenberg-es/client_proofs/create_note_proof';
import { Prover } from 'barretenberg-es/client_proofs/prover';
import { Schnorr } from 'barretenberg-es/crypto/schnorr';
import { Note } from 'barretenberg-es/client_proofs/create_note_proof';
import { Crs } from 'barretenberg-es/crs';
import createDebug from 'debug';
import { WorkerPool } from 'barretenberg-es/wasm/worker_pool';

const debug = createDebug('bb:create_proof');
createDebug.enable('bb:*');

export class ProofCreator {
  private pool!: WorkerPool;
  private schnorr!: Schnorr;
  private createNoteProver!: CreateNoteProver;
  private createNoteVerifier!: CreateNoteVerifier;

  public async init() {
    const circuitSize = 32*1024;

    const crs = new Crs(circuitSize);
    await crs.download();

    this.pool = new WorkerPool();
    // await this.pool.init(Math.min(navigator.hardwareConcurrency, 8));
    await this.pool.init(8);

    const pippenger = new PooledPippenger();
    await pippenger.init(crs.getData(), this.pool);

    const fft = new PooledFft(this.pool);
    await fft.init(circuitSize);

    const barretenberg = this.pool.workers[0];

    const prover = new Prover(barretenberg, pippenger, fft);

    this.schnorr = new Schnorr(barretenberg);
    this.createNoteProver = new CreateNoteProver(barretenberg, prover);
    this.createNoteVerifier = new CreateNoteVerifier(pippenger.pool[0]);

    debug('creating keys...');
    const start = new Date().getTime();
    await this.createNoteProver.init();
    await this.createNoteVerifier.init(crs.getG2Data());
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
  }

  public async destroy() {
    await this.pool.destroy();
  }

  public async createProof() {
    // prettier-ignore
    const pk = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
      0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);
    // prettier-ignore
    const viewingKey = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

    const pubKey = await this.schnorr.computePublicKey(pk);
    const note = new Note(pubKey, viewingKey, 100);
    const encryptedNote = await this.createNoteProver.encryptNote(note);
    const encryptedNoteX = encryptedNote.slice(32, 64);
    const signature = await this.schnorr.constructSignature(encryptedNoteX, pk);

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.createNoteProver.createNoteProof(note, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    return proof;
  }

  public async verifyProof(proof: Buffer) {
    const verified = await this.createNoteVerifier.verifyProof(proof);
    debug(`verified: ${verified}`);
    return verified;
  }
}
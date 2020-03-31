import { fetchCode } from 'barretenberg/wasm';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { SinglePippenger, PooledPippenger } from 'barretenberg/pippenger';
import { CreateNoteProof } from 'barretenberg/client_proofs/create_note_proof';
import { Prover } from 'barretenberg/client_proofs/prover';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import { Note } from 'barretenberg/client_proofs/create';
import { Crs } from 'barretenberg/crs';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import createDebug from 'debug';

const debug = createDebug('create_proof');
createDebug.enable('create_proof,pippenger,barretenberg*');

export class ProofCreator {
  private barretenberg!: BarretenbergWorker;
  private pippenger!: PooledPippenger;
  private schnorr!: Schnorr;
  private createNoteProof!: CreateNoteProof;

  public async init() {
    const code = await fetchCode();

    const barretenberg = await createWorker();
    await barretenberg.init(code);

    const crs = new Crs(32768);
    await crs.download();

    const keyGenPippenger = new SinglePippenger(barretenberg);
    await keyGenPippenger.init(crs.getData());

    debug('creating workers...');
    let start = new Date().getTime();
    this.pippenger = new PooledPippenger(barretenberg);
    await this.pippenger.init(code, crs.getData(), 8);
    debug(`created workers: ${new Date().getTime() - start}ms`);

    const prover = new Prover(barretenberg, crs, this.pippenger);

    this.schnorr = new Schnorr(barretenberg);
    this.createNoteProof = new CreateNoteProof(barretenberg, prover, keyGenPippenger);

    debug('creating keys...');
    start = new Date().getTime();
    await this.createNoteProof.init();
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
  }

  public async destroy() {
    await this.pippenger.destroy();
    destroyWorker(this.barretenberg);
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
    const encryptedNote = await this.createNoteProof.encryptNote(note);
    const encryptedNoteX = encryptedNote.slice(32, 64);
    const signature = await this.schnorr.constructSignature(encryptedNoteX, pk);

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.createNoteProof.createNoteProof(note, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    return proof;
  }

  public async verifyProof(proof: Buffer) {
    const verified = await this.createNoteProof.verifyProof(proof);
    debug(`verified: ${verified}`);
    return verified;
  }
}
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import { CreateProof, Note } from 'barretenberg/client_proofs/create';
import { Crs } from 'barretenberg/crs';

export async function createProof() {
  const barretenberg = new BarretenbergWasm();
  await barretenberg.init();

  const crs = new Crs(32768);
  await crs.download();

  const schnorr = new Schnorr(barretenberg);
  const createProof = new CreateProof(barretenberg);

  let start = new Date().getTime();
  createProof.init(crs);
  // tslint:disable-next-line:no-console
  console.log(`create circuit keys: ${new Date().getTime() - start}ms`);

  // prettier-ignore
  const pk = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
      0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);
  // prettier-ignore
  const viewingKey = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

  const pubKey = schnorr.computePublicKey(pk);
  const note = new Note(pubKey, viewingKey, 100);
  const encryptedNote = createProof.encryptNote(note);
  const encryptedNoteX = encryptedNote.slice(32, 64);
  const signature = schnorr.constructSignature(encryptedNoteX, pk);

  start = new Date().getTime();
  const proof = createProof.createNoteProof(note, signature);
  // tslint:disable-next-line:no-console
  console.log(`create proof time: ${new Date().getTime() - start}ms`);

  const verified = createProof.verifyProof(proof);
  console.log(verified);
}

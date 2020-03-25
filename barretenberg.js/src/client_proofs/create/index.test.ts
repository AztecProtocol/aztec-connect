import { BarretenbergWasm } from '../../wasm';
import { CreateProof, Note } from './index';
import { Schnorr } from '../../crypto/schnorr';
import { Crs } from '../../crs';
import { randomBytes } from 'crypto';

describe('create_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let createProof!: CreateProof;
  let schnorr!: Schnorr;

  beforeAll(async () => {
    barretenberg = new BarretenbergWasm();
    await barretenberg.init();

    const crs = new Crs(32768);
    await crs.download();

    schnorr = new Schnorr(barretenberg);
    createProof = new CreateProof(barretenberg);

    const start = new Date().getTime();
    createProof.init(crs);
    // tslint:disable-next-line:no-console
    console.log(`create circuit keys: ${new Date().getTime() - start}ms`);
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

    const pubKey = schnorr.computePublicKey(pk);
    const note = new Note(pubKey, viewingKey, 100);
    const encryptedNote = createProof.encryptNote(note);
    const encryptedNoteX = encryptedNote.slice(32, 64);
    const signature = schnorr.constructSignature(encryptedNoteX, pk);

    expect(schnorr.verifySignature(encryptedNoteX, pubKey, signature)).toBe(true);

    const start = new Date().getTime();
    const proof = createProof.createNoteProof(note, signature);
    // tslint:disable-next-line:no-console
    console.log(`create proof time: ${new Date().getTime() - start}ms`);

    expect(createProof.verifyProof(proof)).toBe(true);
  }, 60000);
});

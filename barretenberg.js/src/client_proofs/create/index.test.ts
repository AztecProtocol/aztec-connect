import { BarretenbergWasm } from '../../wasm';
import { CreateProof } from './index';
import { Schnorr } from '../../crypto/schnorr';
import { randomBytes } from 'crypto';

describe('create_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let createProof!: CreateProof;
  let schnorr!: Schnorr;

  beforeAll(async () => {
    barretenberg = new BarretenbergWasm();
    await barretenberg.init();
    createProof = new CreateProof(barretenberg);
    schnorr = new Schnorr(barretenberg);
  });

  it('should construct "create note" proof', async () => {
    // prettier-ignore
    const pk = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
      0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);
    const pubKey = schnorr.computePublicKey(pk);
    const viewingKey = randomBytes(32);
    const noteData = createProof.createNote(pubKey, 100, viewingKey);
    console.log(noteData);
    const signature = schnorr.constructSignature(noteData, pk);
    console.log(signature);

    const proof = createProof.createNoteProof(pubKey, 100, viewingKey, signature);
  });
});

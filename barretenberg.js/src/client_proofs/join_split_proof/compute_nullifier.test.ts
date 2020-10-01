import { BarretenbergWasm } from '../../wasm';
import { Blake2s } from '../../crypto/blake2s';
import { Note } from '../note';
import { computeNullifier } from './compute_nullifier';
import { Grumpkin } from '../../ecc/grumpkin';
import { GrumpkinAddress } from '../../address';
import { NoteAlgorithms } from '../note_algorithms';

describe('compute_nullifier', () => {
  // prettier-ignore
  const privateKey = Buffer.from([
    0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
    0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);
  // prettier-ignore
  const viewingKey = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
    0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

  it('should compute correct nullifier', async () => {
    const barretenberg = await BarretenbergWasm.new();
    const blake2s = new Blake2s(barretenberg);
    const grumpkin = new Grumpkin(barretenberg);
    const noteAlgos = new NoteAlgorithms(barretenberg);

    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    const inputNote1 = new Note(pubKey, viewingKey, BigInt(100), 0);
    const inputNote2 = new Note(pubKey, viewingKey, BigInt(50), 0);

    const inputNote1Enc = await noteAlgos.encryptNote(inputNote1);
    const inputNote2Enc = await noteAlgos.encryptNote(inputNote2);

    const nullifier1 = computeNullifier(inputNote1Enc, 0, inputNote1.secret, blake2s);
    const nullifier2 = computeNullifier(inputNote2Enc, 1, inputNote2.secret, blake2s);

    const expected1 = Buffer.from('127fc1c9a473d1b8e696d3cdbab8b1880bcc15185f3a13919880bfe00d44d819', 'hex');
    const expected2 = Buffer.from('0915f79d51b5721414bdff57db50db28da170648efba1cb084d14fcbb16a1e59', 'hex');

    expect(nullifier1).toEqual(expected1);
    expect(nullifier2).toEqual(expected2);
  }, 120000);
});

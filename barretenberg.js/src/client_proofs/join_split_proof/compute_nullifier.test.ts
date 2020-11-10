import { BarretenbergWasm } from '../../wasm';
import { Pedersen } from '../../crypto/pedersen';
import { Note } from '../note';
import { computeAliasNullifier } from './compute_nullifier';
import { Grumpkin } from '../../ecc/grumpkin';
import { GrumpkinAddress } from '../../address';
import { NoteAlgorithms } from '../note_algorithms';
import { Blake2s } from '../../crypto/blake2s';

describe('compute_nullifier', () => {
  let barretenberg!: BarretenbergWasm;
  let pedersen!: Pedersen;
  let grumpkin!: Grumpkin;
  let blake2s!: Blake2s;

  // prettier-ignore
  const privateKey = Buffer.from([
    0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
    0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);
  // prettier-ignore
  const viewingKey = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
    0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
    pedersen = new Pedersen(barretenberg);
    grumpkin = new Grumpkin(barretenberg);
    blake2s = new Blake2s(barretenberg);
  });

  it('should compute correct nullifier', async () => {
    const noteAlgos = new NoteAlgorithms(barretenberg);

    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    const inputNote1 = new Note(pubKey, viewingKey, BigInt(100), 0);
    const inputNote2 = new Note(pubKey, viewingKey, BigInt(50), 0);

    const inputNote1Enc = await noteAlgos.encryptNote(inputNote1);
    const inputNote2Enc = await noteAlgos.encryptNote(inputNote2);

    const nullifier1 = noteAlgos.computeNoteNullifier(inputNote1Enc, 1, viewingKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(inputNote2Enc, 0, inputNote2.secret);

    const expected1 = Buffer.from('031a2fa1120fc9a7e36dfd45ca6d0f8ef24b8cac0aa59640b71c4e972bcb0ed9', 'hex');
    const expected2 = Buffer.from('3030cb82a11761187c21427cb1793b72ce6a7addfe0b3dc02aa11e8d32cb64af', 'hex');

    expect(nullifier1).toEqual(expected1);
    expect(nullifier2).toEqual(expected2);
  });

  it('should compute correct alias nullifier', async () => {
    const alias = 'pebble';
    const expected = Buffer.from('23a70515675b3e082ffb681f4c03dc2dbb1ab362c7edd88046bb95be6d34c10b', 'hex');
    const nullifier = computeAliasNullifier(alias, pedersen, blake2s);
    expect(nullifier).toEqual(expected);
  });
});

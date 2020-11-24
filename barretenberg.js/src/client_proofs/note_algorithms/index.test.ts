import { BarretenbergWasm } from '../../wasm';
import { Note } from '../note';
import { Grumpkin } from '../../ecc/grumpkin';
import { GrumpkinAddress } from '../../address';
import { NoteAlgorithms } from '.';

describe('compute_nullifier', () => {
  let barretenberg!: BarretenbergWasm;
  let grumpkin!: Grumpkin;

  const privateKey = Buffer.from('0b9b3adee6b3d81b28a0886b2a8415c7da31291a5e96bb7a56639e177d301beb', 'hex');
  const viewingKey = Buffer.from('0000000011111111000000001111111100000000111111110000000011111111', 'hex');

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
  });

  it('should compute correct nullifier', async () => {
    const noteAlgos = new NoteAlgorithms(barretenberg);

    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    const inputNote1 = new Note(pubKey, viewingKey, BigInt(100), 0, 0);
    const inputNote2 = new Note(pubKey, viewingKey, BigInt(50), 0, 0);

    const inputNote1Enc = await noteAlgos.encryptNote(inputNote1);
    const inputNote2Enc = await noteAlgos.encryptNote(inputNote2);

    const nullifier1 = noteAlgos.computeNoteNullifier(inputNote1Enc, 1, viewingKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(inputNote2Enc, 0, inputNote2.secret);

    const expected1 = Buffer.from('031a2fa1120fc9a7e36dfd45ca6d0f8ef24b8cac0aa59640b71c4e972bcb0ed9', 'hex');
    const expected2 = Buffer.from('3030cb82a11761187c21427cb1793b72ce6a7addfe0b3dc02aa11e8d32cb64af', 'hex');

    expect(nullifier1).toEqual(expected1);
    expect(nullifier2).toEqual(expected2);
  });
});

import { BarretenbergWasm } from '../../wasm';
import { Note } from '../note';
import { Grumpkin } from '../../ecc/grumpkin';
import { GrumpkinAddress } from '../../address';
import { NoteAlgorithms } from '.';

describe('compute_nullifier', () => {
  let barretenberg!: BarretenbergWasm;
  let grumpkin!: Grumpkin;

  const privateKey = Buffer.from('0b9b3adee6b3d81b28a0886b2a8415c7da31291a5e96bb7a56639e177d301beb', 'hex');
  const noteSecret = Buffer.from('0000000011111111000000001111111100000000111111110000000011111111', 'hex');

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
  });

  it('should compute correct nullifier', async () => {
    const noteAlgos = new NoteAlgorithms(barretenberg);

    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    const inputNote1 = new Note(pubKey, BigInt(100), 0, 0, noteSecret);
    const inputNote2 = new Note(pubKey, BigInt(50), 0, 0, noteSecret);
    inputNote1.noteSecret = noteSecret;
    inputNote2.noteSecret = noteSecret;

    const inputNote1Enc = await noteAlgos.encryptNote(inputNote1);
    const inputNote2Enc = await noteAlgos.encryptNote(inputNote2);

    const nullifier1 = noteAlgos.computeNoteNullifier(inputNote1Enc, 1, privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(inputNote2Enc, 0, privateKey);

    const expected1 = Buffer.from('1f89396dd0a2e545efc10358d44e3a0ac32e89b2baaca6c1da1b62750983c425', 'hex');
    const expected2 = Buffer.from('29b160b6d2f2d6e7fb253945786696d84fdb023372e5bf33d9838802d28730f5', 'hex');

    expect(nullifier1).toEqual(expected1);
    expect(nullifier2).toEqual(expected2);
  });
});

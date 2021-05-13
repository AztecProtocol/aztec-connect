import { BarretenbergWasm } from '../../wasm';
import { Grumpkin } from '../../ecc/grumpkin';
import { GrumpkinAddress } from '../../address';
import { NoteAlgorithms } from '.';
import { TreeNote } from '../tree_note';
// import createDebug from 'debug';

// const debug = createDebug('bb:decrypt_test');

describe('compute_nullifier', () => {
  let barretenberg!: BarretenbergWasm;
  let grumpkin!: Grumpkin;
  let noteAlgos!: NoteAlgorithms;

  const privateKey = Buffer.from('0b9b3adee6b3d81b28a0886b2a8415c7da31291a5e96bb7a56639e177d301beb', 'hex');
  const noteSecret = Buffer.from('0000000011111111000000001111111100000000111111110000000011111111', 'hex');

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);
  });

  it('should compute correct nullifier', async () => {
    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    const inputNote1 = new TreeNote(pubKey, BigInt(100), 0, 0, noteSecret);
    const inputNote2 = new TreeNote(pubKey, BigInt(50), 0, 0, noteSecret);
    inputNote1.noteSecret = noteSecret;
    inputNote2.noteSecret = noteSecret;

    const inputNote1Enc = noteAlgos.encryptNote(inputNote1.toBuffer());
    const inputNote2Enc = noteAlgos.encryptNote(inputNote2.toBuffer());

    const nullifier1 = noteAlgos.computeNoteNullifier(inputNote1Enc, 1, privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(inputNote2Enc, 0, privateKey);

    const expected1 = Buffer.from('056d84d285fc3c0f02d2b3fe61ec526d92601f25ce03a13915c87f27d803ba63', 'hex');
    const expected2 = Buffer.from('2756b99eed35e5da1a0e7769b162f69a56d4e22f98446c47f1cd89fb429b32a4', 'hex');

    expect(nullifier1).toEqual(expected1);
    expect(nullifier2).toEqual(expected2);
  });
});

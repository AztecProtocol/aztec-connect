import { toBufferBE } from 'bigint-buffer';
import { NotePicker } from './';
import { Note } from '../note';

const computeNullifier = (value: bigint) => toBufferBE(value, 32);

const randomNote = (index: number, value: bigint) =>
  ({
    index,
    value,
    nullifier: computeNullifier(value),
  } as Note);

const randomNotes = (values: bigint[]) => values.map((value, index) => randomNote(index, value));

describe('NotePicker', () => {
  const notes = randomNotes([10n, 1n, 0n, 7n, 3n, 2n]);

  it('pick a pair of notes whose sum is equal to or larger than the required sum', () => {
    const notePicker = new NotePicker(notes);
    expect(notePicker.pick(15n)).toEqual([
      expect.objectContaining({ value: 7n }),
      expect.objectContaining({ value: 10n }),
    ]);
    expect(notePicker.pick(10n)).toEqual([
      expect.objectContaining({ value: 3n }),
      expect.objectContaining({ value: 7n }),
    ]);
    expect(notePicker.pick(1n)).toEqual([
      expect.objectContaining({ value: 0n }),
      expect.objectContaining({ value: 1n }),
    ]);
    expect(notePicker.pick(0n)).toEqual([
      expect.objectContaining({ value: 0n }),
      expect.objectContaining({ value: 1n }),
    ]);
    expect(notePicker.pick(20n)).toBe(null);
  });

  it('will not pick excluded notes', () => {
    const notePicker = new NotePicker(notes);
    expect(notePicker.pick(10n)).toEqual([
      expect.objectContaining({ value: 3n }),
      expect.objectContaining({ value: 7n }),
    ]);

    // exclude 7n
    const excludeNullifiers = [computeNullifier(7n)];
    expect(notePicker.pick(10n, excludeNullifiers)).toEqual([
      expect.objectContaining({ value: 0n }),
      expect.objectContaining({ value: 10n }),
    ]);

    // exclude 7n and 10n
    const excludeNullifiers2 = [computeNullifier(7n), computeNullifier(10n)];
    expect(notePicker.pick(10n, excludeNullifiers2)).toBe(null);
  });

  it('calculate the sum of all notes', () => {
    const notePicker = new NotePicker(notes);
    expect(notePicker.getSum()).toBe(23n);
  });

  it('calculate the sum of spendable notes', () => {
    // exclude 10n and 7n
    const excluded = [0, 3];
    const notePicker = new NotePicker(notes, excluded);
    expect(notePicker.getSpendableSum()).toBe(6n);

    // exclude 2n
    const excludeNullifiers = [computeNullifier(2n)];
    expect(notePicker.getSpendableSum(excludeNullifiers)).toBe(4n);
  });

  it('calculate the sum of 2 largest spendable notes', () => {
    const notePicker = new NotePicker(notes);
    expect(notePicker.getMaxSpendableValue()).toBe(10n + 7n);

    // exclude 10n and 3n
    const excluded = [0, 4];
    const notePickerSubset = new NotePicker(notes, excluded);
    expect(notePickerSubset.getMaxSpendableValue()).toBe(7n + 2n);

    // exclude 2n
    const excludeNullifiers = [computeNullifier(2n)];
    expect(notePickerSubset.getMaxSpendableValue(excludeNullifiers)).toBe(7n + 1n);

    // exclude all but 3n
    const excluded2 = [0, 1, 2, 3, 5];
    const notePickerSingle = new NotePicker(notes, excluded2);
    expect(notePickerSingle.getMaxSpendableValue()).toBe(3n);
  });
});

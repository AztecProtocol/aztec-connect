import { Note } from '../note';
import { pick } from './pick';
import { SortedNotes } from './sorted_notes';

const toSortedNotes = (values: bigint[]) => {
  const notes = values.map(
    (value, index) =>
      ({
        index,
        value,
      } as Note),
  );
  return new SortedNotes(notes);
};

describe('pick', () => {
  it('pick a pair of notes whose sum is equal to or larger than the required sum', () => {
    const sortedNotes = toSortedNotes([0n, 1n, 2n, 3n, 6n, 10n]);

    expect(pick(sortedNotes, 8n)).toEqual([
      { index: 2, value: 2n },
      { index: 4, value: 6n },
    ]);

    expect(pick(sortedNotes, 15n)).toEqual([
      { index: 4, value: 6n },
      { index: 5, value: 10n },
    ]);
  });

  it('return the pair of notes whose sum is the smallest among all qualified pairs', () => {
    const sortedNotes = toSortedNotes([1n, 3n, 5n, 8n, 12n, 20n]);

    expect(pick(sortedNotes, 10n)).toEqual([
      { index: 1, value: 3n },
      { index: 3, value: 8n },
    ]);
  });

  it('return the pair of notes that has the closest value to each other', () => {
    const sortedNotes = toSortedNotes([1n, 2n, 3n, 4n, 5n, 6n, 7n]);

    expect(pick(sortedNotes, 7n)).toEqual([
      { index: 2, value: 3n },
      { index: 3, value: 4n },
    ]);

    expect(pick(sortedNotes, 8n)).toEqual([
      { index: 2, value: 3n },
      { index: 4, value: 5n },
    ]);
  });

  it('return the note if there is only one note and its value is equal to or larger than the required sum', () => {
    const sortedNotes = toSortedNotes([2n]);

    expect(pick(sortedNotes, 1n)).toEqual([{ index: 0, value: 2n }]);

    expect(pick(sortedNotes, 2n)).toEqual([{ index: 0, value: 2n }]);
  });

  it('return null if the only note value is less than the required sum', () => {
    const sortedNotes = toSortedNotes([2n]);

    expect(pick(sortedNotes, 3n)).toBe(null);
  });

  it('return null if there is no combinations whose sum is equal to or larger than the required sum', () => {
    const sortedNotes = toSortedNotes([2n, 5n, 8n, 10n]);

    expect(pick(sortedNotes, 20n)).toBe(null);
  });

  it('return null if there is no notes', () => {
    const sortedNotes = toSortedNotes([]);

    expect(pick(sortedNotes, 1n)).toBe(null);
  });
});

import { Note } from '../note';
import { pick } from './pick';
import { SortedNotes } from './sorted_notes';

const toSortedNotes = (values: number[]) => {
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
    const sortedNotes = toSortedNotes([0, 1, 2, 3, 6, 10]);

    expect(pick(sortedNotes, 8)).toEqual([
      { index: 2, value: 2 },
      { index: 4, value: 6 },
    ]);

    expect(pick(sortedNotes, 15)).toEqual([
      { index: 4, value: 6 },
      { index: 5, value: 10 },
    ]);
  });

  it('return the pair of notes whose sum is the smallest among all qualified pairs', () => {
    const sortedNotes = toSortedNotes([1, 3, 5, 8, 12, 20]);

    expect(pick(sortedNotes, 10)).toEqual([
      { index: 1, value: 3 },
      { index: 3, value: 8 },
    ]);
  });

  it('return the pair of notes that has the closest value to each other', () => {
    const sortedNotes = toSortedNotes([1, 2, 3, 4, 5, 6, 7]);

    expect(pick(sortedNotes, 7)).toEqual([
      { index: 2, value: 3 },
      { index: 3, value: 4 },
    ]);

    expect(pick(sortedNotes, 8)).toEqual([
      { index: 2, value: 3 },
      { index: 4, value: 5 },
    ]);
  });

  it('return the note if there is only one note and its value is equal to or larger than the required sum', () => {
    const sortedNotes = toSortedNotes([2]);

    expect(pick(sortedNotes, 1)).toEqual([{ index: 0, value: 2 }]);

    expect(pick(sortedNotes, 2)).toEqual([{ index: 0, value: 2 }]);
  });

  it('return null if the only note value is less than the required sum', () => {
    const sortedNotes = toSortedNotes([2]);

    expect(pick(sortedNotes, 3)).toBe(null);
  });

  it('return null if there is no combinations whose sum is equal to or larger than the required sum', () => {
    const sortedNotes = toSortedNotes([2, 5, 8, 10]);

    expect(pick(sortedNotes, 20)).toBe(null);
  });

  it('return null if there is no notes', () => {
    const sortedNotes = toSortedNotes([]);

    expect(pick(sortedNotes, 1)).toBe(null);
  });
});

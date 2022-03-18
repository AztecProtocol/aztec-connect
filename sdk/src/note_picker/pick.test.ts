import { Note } from '../note';
import { pick } from './pick';
import { SortedNotes } from './sorted_notes';

const toSortedNotes = (values: bigint[], allowChainIdx: number[] = []) => {
  const notes = values.map(
    (value, i) =>
      ({
        value,
        allowChain: allowChainIdx.includes(i),
      } as Note),
  );
  return new SortedNotes(notes);
};

const expectNoteValues = (notes: Note[] | null, values: bigint[] | null) => {
  if (notes && values) {
    expect(notes).toEqual(values.map(value => expect.objectContaining({ value })));
  } else {
    expect(notes).toBe(values);
  }
};

describe('pick', () => {
  it('pick a pair of notes whose sum is equal to or larger than the required sum', () => {
    const sortedNotes = toSortedNotes([0n, 1n, 2n, 3n, 6n, 10n]);
    expectNoteValues(pick(sortedNotes, 8n), [2n, 6n]);
    expectNoteValues(pick(sortedNotes, 15n), [6n, 10n]);
  });

  it('return the pair of notes whose sum is the smallest among all qualified pairs', () => {
    const sortedNotes = toSortedNotes([1n, 3n, 5n, 8n, 12n, 20n]);
    expectNoteValues(pick(sortedNotes, 10n), [3n, 8n]);
  });

  it('return the pair of notes that has the closest value to each other', () => {
    const sortedNotes = toSortedNotes([1n, 2n, 3n, 4n, 5n, 6n, 7n]);
    expectNoteValues(pick(sortedNotes, 7n), [3n, 4n]);
    expectNoteValues(pick(sortedNotes, 8n), [3n, 5n]);
  });

  it('return the note if there is only one note and its value is equal to or larger than the required sum', () => {
    const sortedNotes = toSortedNotes([2n]);
    expectNoteValues(pick(sortedNotes, 1n), [2n]);
    expectNoteValues(pick(sortedNotes, 2n), [2n]);
  });

  it('return null if the only note value is less than the required sum', () => {
    const sortedNotes = toSortedNotes([2n]);
    expectNoteValues(pick(sortedNotes, 3n), null);
  });

  it('return null if there is no combinations whose sum is equal to or larger than the required sum', () => {
    const sortedNotes = toSortedNotes([2n, 5n, 8n, 10n]);
    expectNoteValues(pick(sortedNotes, 20n), null);
  });

  it('return null if there is no notes', () => {
    const sortedNotes = toSortedNotes([]);
    expectNoteValues(pick(sortedNotes, 1n), null);
  });

  it('return a pair of notes that contains at most one note with allowChain set to true', () => {
    {
      const sortedNotes = toSortedNotes([1n, 2n, 3n, 4n, 5n, 6n], [2, 3]); // allowChain: 3n, 4n
      expectNoteValues(pick(sortedNotes, 7n), [2n, 5n]);
    }
    {
      const sortedNotes = toSortedNotes([1n, 2n, 3n, 4n, 5n, 6n], [2, 4]); // allowChain: 3n, 5n
      expectNoteValues(pick(sortedNotes, 7n), [3n, 4n]);
    }
    {
      const sortedNotes = toSortedNotes([1n, 2n, 3n, 4n, 5n, 6n], [1, 4]); // allowChain: 2n, 5n
      expectNoteValues(pick(sortedNotes, 7n), [3n, 4n]);
    }
    {
      const sortedNotes = toSortedNotes([2n, 3n, 4n], [1]);
      expectNoteValues(pick(sortedNotes, 3n), [2n, 3n]);
    }
    {
      const sortedNotes = toSortedNotes([2n, 3n, 4n], [0, 1]);
      expectNoteValues(pick(sortedNotes, 3n), [2n, 4n]);
    }
    {
      const sortedNotes = toSortedNotes([1n, 2n, 3n], [0, 1, 2]);
      expectNoteValues(pick(sortedNotes, 2n), [2n]);
    }
  });
});

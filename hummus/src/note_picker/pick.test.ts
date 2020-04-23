import * as random from '../utils/random';
import { pick, getStartIndex } from './pick';
import SortedNotes from './sorted_notes';

const toSortedNotes = (values: number[]) => {
  const notes = values.map((value, index) => ({
    index,
    note: {
      value,
    },
  }));
  // @ts-ignore
  return new SortedNotes(notes);
};

describe('getStartIndex', () => {
  it('return a start index that will guarantee at least one valid combination after that index', () => {
    const sortedNotes = toSortedNotes([0, 1, 2, 3, 4, 5, 6]);
    expect(getStartIndex(sortedNotes, 4, 1)).toBe(4);
    expect(getStartIndex(sortedNotes, 4, 2)).toBe(0);
    expect(getStartIndex(sortedNotes, 4, 3)).toBe(0);
    expect(getStartIndex(sortedNotes, 9, 2)).toBe(3);
    expect(getStartIndex(sortedNotes, 9, 3)).toBe(0);
  });

  it('properly process repeating values', () => {
    const sortedNotes = toSortedNotes([0, 1, 1, 1, 1, 1, 2, 3, 4, 5]);
    expect(getStartIndex(sortedNotes, 3, 1)).toBe(7);
    expect(getStartIndex(sortedNotes, 3, 2)).toBe(0);
    expect(getStartIndex(sortedNotes, 6, 2)).toBe(1);
    expect(getStartIndex(sortedNotes, 7, 2)).toBe(6);
  });

  it('return -1 if there is no valid combination in it', () => {
    const sortedNotes = toSortedNotes([0, 1, 2, 3, 4, 5, 6]);
    expect(getStartIndex(sortedNotes, 7, 1)).toBe(-1);
    expect(getStartIndex(sortedNotes, 12, 2)).toBe(-1);
  });
});

describe('pick', () => {
  it('pick a set of notes from sortedNotes whose sum is equal to or larger than value', () => {
    const sortedNotes = toSortedNotes([0, 0, 1, 1, 4, 10]);

    expect(pick(
      sortedNotes,
      6,
      0,
    )).toEqual([]);

    expect(pick(
      sortedNotes,
      6,
      1,
    )).toEqual([
      {
        index: 5,
        note: {
          value: 10,
        },
      },
    ]);

    expect(pick(
      sortedNotes,
      13,
      2,
    )).toEqual([
      {
        index: 4,
        note:
        {
          value: 4,
        },
      },
      {
        index: 5,
        note: {
          value: 10,
        },
      },
    ]);
  });

  it('throw error if there is no note combinations whose sum is equal to or larger than value', () => {
    const sortedNotes = toSortedNotes([0, 10, 100]);

    expect(() => pick(
      sortedNotes,
      1000,
      1,
    )).toThrow();

    expect(() => pick(
      sortedNotes,
      1000,
      3,
    )).toThrow();
  });

  it('skip repeating min values if current sum is not enough', () => {
    const sortedNotes = toSortedNotes([1, 1, 1, 1, 1, 2, 2, 3]);

    const randomIntsSpy = jest.spyOn(random, 'randomInts')
      .mockImplementationOnce(() => [
        0,
        1,
      ]);
    pick(
      sortedNotes,
      4,
      2,
    );
    expect(randomIntsSpy.mock.calls[1][1]).toBe(4); // start index in second round. the second round can have up to one 1.

    randomIntsSpy.mockClear();
    randomIntsSpy.mockImplementationOnce(() => [
      0,
      4,
    ]);
    pick(
      sortedNotes,
      4,
      2,
    );
    expect(randomIntsSpy.mock.calls[1][1]).toBe(4); // the second round can have up to one 1.

    randomIntsSpy.mockClear();
    randomIntsSpy.mockImplementationOnce(() => [
      0,
      5,
    ]);
    pick(
      sortedNotes,
      4,
      2,
    );
    expect(randomIntsSpy.mock.calls[1][1]).toBe(5); // the second round can not contain 1s.
  });
});

import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { NotePicker } from './index.js';
import { Note } from '../note/index.js';

const computeNullifier = (value: bigint) => toBufferBE(value, 32);

const computeNullifiers = (values: bigint[]) => values.map(computeNullifier);

const randomNote = (value: bigint, { allowChain = false, pending = false, spendingKeyRequired = false } = {}) =>
  ({
    value,
    nullifier: computeNullifier(value),
    allowChain,
    pending,
    ownerAccountRequired: spendingKeyRequired,
  } as Note);

const randomRegisteredNote = (value: bigint, { allowChain = false, pending = false } = {}) =>
  randomNote(value, { allowChain, pending, spendingKeyRequired: true });

const randomNotes = (values: bigint[]) => values.map(value => randomNote(value));

const expectValues = (values: bigint[], expected: bigint[]) => {
  expect(values.length).toBe(expected.length);
  expect(values).toEqual(expect.arrayContaining(expected));
};

const expectNoteValues = (notes: Note[], expected: bigint[]) => {
  const values = notes.map(n => n.value);
  expectValues(values, expected);
};

describe('NotePicker', () => {
  const allowChain = true;
  const pending = true;
  const spendingKeyRequired = true;
  const notes = randomNotes([10n, 1n, 7n, 9n, 3n, 2n]);
  const excludePendingNotes = true;
  const mixedNotes = [
    randomNote(11n),
    randomRegisteredNote(19n),
    randomNote(23n, { allowChain }),
    randomRegisteredNote(17n, { allowChain }),
    randomNote(7n, { pending }),
    randomRegisteredNote(3n, { pending }),
    randomNote(13n, { allowChain, pending }),
    randomRegisteredNote(5n, { allowChain, pending }),
  ];

  describe('pick', () => {
    it('pick notes whose sum is equal to or larger than the required sum', () => {
      const notePicker = new NotePicker(notes);
      expectNoteValues(notePicker.pick(24n), [7n, 9n, 10n]);
      expectNoteValues(notePicker.pick(20n), [1n, 9n, 10n]);
      expectNoteValues(notePicker.pick(15n), [7n, 9n]);
      expectNoteValues(notePicker.pick(10n), [1n, 9n]);
      expectNoteValues(notePicker.pick(8n), [1n, 7n]);
      expectNoteValues(notePicker.pick(7n), [7n]);
    });

    it('pick notes that contains at most one pending note with allowChain set to true', () => {
      const pendingNotes = [
        randomNote(5n, { allowChain, pending }),
        randomNote(6n, { allowChain, pending }),
        randomNote(4n, { allowChain, pending }),
      ];
      const notePicker = new NotePicker([...notes, ...pendingNotes]);
      expectNoteValues(notePicker.pick(36n), [1n, 3n, 6n, 7n, 9n, 10n]);
      expectNoteValues(notePicker.pick(11n), [1n, 10n]);
    });

    it('will work with only pending notes', () => {
      const pendingNotes = [
        randomNote(4n, { allowChain, pending }),
        randomNote(4n, { pending }),
        randomNote(6n, { allowChain, pending }),
      ];
      const notePicker = new NotePicker(pendingNotes);
      expectNoteValues(notePicker.pick(7n), []);
      expectNoteValues(notePicker.pick(6n), [6n]);
      expectNoteValues(notePicker.pick(5n), [6n]);
      expectNoteValues(notePicker.pick(4n), [4n]);
      expectNoteValues(notePicker.pick(3n), [4n]);
    });

    it('will not pick a pending note if excluded', () => {
      const pendingNotes = [randomNote(11n, { allowChain, pending })];
      const notePicker = new NotePicker([...notes, ...pendingNotes]);
      expectNoteValues(notePicker.pick(21n, { excludePendingNotes }), [2n, 9n, 10n]);
    });

    it('will not pick a pending note with allowChain set to false', () => {
      const pendingNotes = [randomNote(11n, { pending })];
      const notePicker = new NotePicker([...notes, ...pendingNotes]);
      expectNoteValues(notePicker.pick(21n), [2n, 9n, 10n]);
    });

    it('will not pick excluded notes', () => {
      const notePicker = new NotePicker(notes);
      expectNoteValues(notePicker.pick(10n), [1n, 9n]);
      {
        const excludedNullifiers = computeNullifiers([9n]);
        expectNoteValues(notePicker.pick(10n, { excludedNullifiers }), [10n]);
      }
      {
        const excludedNullifiers = computeNullifiers([1n, 10n]);
        expectNoteValues(notePicker.pick(10n, { excludedNullifiers }), [2n, 9n]);
      }
      {
        const excludedNullifiers = computeNullifiers([7n, 9n, 10n]);
        expectNoteValues(notePicker.pick(10n, { excludedNullifiers }), []);
      }
    });

    it('pick a settled note if there is more than one note with the exact value', () => {
      const pendingNotes = [randomNote(10n, { allowChain, pending })];
      const notePicker = new NotePicker([...notes, ...pendingNotes]);
      expect(notePicker.pick(19n)).toEqual([
        expect.objectContaining({ value: 9n, pending: false }),
        expect.objectContaining({ value: 10n, pending: false }),
      ]);
    });

    it('pick registered notes', () => {
      const notePicker = new NotePicker(mixedNotes);
      const excludedNullifiers = computeNullifiers([17n]);
      expectNoteValues(notePicker.pick(7n, { spendingKeyRequired }), [5n, 17n]);
      expectNoteValues(notePicker.pick(7n, { spendingKeyRequired, excludedNullifiers }), [5n, 19n]);
      expectNoteValues(notePicker.pick(7n, { spendingKeyRequired, excludePendingNotes }), [17n, 19n]);
    });

    it('should pick among a large number of notes', () => {
      const notes = randomNotes(
        Array(1000)
          .fill(null)
          .map((_, i) => BigInt(i) + 1n),
      );
      const notePicker = new NotePicker(notes);
      const value = 400_000n;

      const pickedNotes = notePicker.pick(value);
      expect(pickedNotes.reduce((acc, curr) => acc + curr.value, 0n)).toBeGreaterThanOrEqual(value);
    });
  });

  describe('pickOne', () => {
    const pendingNotes = [
      randomNote(5n, { pending }),
      randomNote(4n, { allowChain, pending }),
      randomNote(6n, { allowChain, pending }),
    ];
    const notePicker = new NotePicker([...notes, ...pendingNotes]);

    it('pick 1 note whose value is equal to or larger than the required sum', () => {
      expect(notePicker.pickOne(15n)).toBe(undefined);
      expect(notePicker.pickOne(10n)!.value).toBe(10n);
      expect(notePicker.pickOne(6n)!.value).toBe(6n);
      expect(notePicker.pickOne(4n)!.value).toBe(4n);
      expect(notePicker.pickOne(2n)!.value).toBe(2n);
    });

    it('will not pick unchainable note', () => {
      expect(notePicker.pickOne(5n)!.value).toBe(6n);
    });

    it('will not pick pending note if excluded', () => {
      expect(notePicker.pickOne(6n, { excludePendingNotes })!.value).toBe(7n);
      expect(notePicker.pickOne(5n, { excludePendingNotes })!.value).toBe(7n);
      expect(notePicker.pickOne(4n, { excludePendingNotes })!.value).toBe(7n);
      expect(notePicker.pickOne(2n, { excludePendingNotes })!.value).toBe(2n);
    });

    it('will not pick excluded note', () => {
      const excludedNullifiers = computeNullifiers([2n, 6n, 7n]);
      expect(notePicker.pickOne(5n, { excludedNullifiers })!.value).toBe(9n);
      expect(notePicker.pickOne(2n, { excludedNullifiers })!.value).toBe(3n);
    });

    it('pick a settled note if there is more than one note with the same value', () => {
      const notes = [randomNote(4n, { pending }), randomNote(4n), randomNote(4n, { allowChain, pending })];
      const notePicker = new NotePicker(notes);
      expect(notePicker.pickOne(4n)).toEqual(expect.objectContaining({ value: 4n, allowChain: false, pending: false }));
      expect(notePicker.pickOne(3n)).toEqual(expect.objectContaining({ value: 4n, allowChain: false, pending: false }));
    });

    it('pick registered notes if specified', () => {
      const notePicker = new NotePicker(mixedNotes);
      expect(notePicker.pickOne(7n, { spendingKeyRequired })!.value).toBe(17n);
    });
  });

  describe('getSum', () => {
    it('calculate the sum of settled notes', () => {
      {
        const notePicker = new NotePicker(notes);
        expect(notePicker.getSum()).toBe(1n + 2n + 3n + 7n + 9n + 10n);
      }
      {
        const notePicker = new NotePicker([
          ...notes,
          randomNote(5n, { pending }),
          randomNote(4n, { allowChain, pending }),
        ]);
        expect(notePicker.getSum()).toBe(1n + 2n + 3n + 7n + 9n + 10n);
      }
      {
        const notePicker = new NotePicker(mixedNotes);
        expect(notePicker.getSum()).toBe(11n + 19n + 23n + 17n);
      }
    });
  });

  describe('getSpendableNoteValues', () => {
    const notePicker = new NotePicker([
      ...notes,
      randomNote(4n, { allowChain, pending }),
      randomNote(6n, { allowChain, pending }),
      randomNote(5n, { pending }),
    ]);

    it('return spendable notes', () => {
      expectValues(notePicker.getSpendableNoteValues(), [1n, 2n, 3n, 4n, 6n, 7n, 9n, 10n]);
      {
        const excludedNullifiers = computeNullifiers([10n, 7n]);
        expectValues(notePicker.getSpendableNoteValues({ excludedNullifiers }), [1n, 2n, 3n, 4n, 6n, 9n]);
      }
      {
        const excludedNullifiers = computeNullifiers([2n, 6n]);
        expectValues(notePicker.getSpendableNoteValues({ excludedNullifiers }), [1n, 3n, 4n, 7n, 9n, 10n]);
      }
    });

    it('calculate the sum of spendable notes excluding pending notes', () => {
      expectValues(notePicker.getSpendableNoteValues({ excludePendingNotes }), [1n, 2n, 3n, 7n, 9n, 10n]);
    });

    it('calculate the sum of spendable registered notes', () => {
      const notePicker = new NotePicker(mixedNotes);
      expectValues(notePicker.getSpendableNoteValues({ spendingKeyRequired }), [19n, 17n, 5n]);
    });
  });

  describe('getMaxSpendableNoteValue', () => {
    const notePicker = new NotePicker([
      ...notes,
      randomNote(5n, { pending }),
      randomNote(4n, { allowChain, pending }),
      randomNote(6n, { allowChain, pending }),
    ]);

    it('get the sum of the n largest spendable notes with at most one pending note', () => {
      expectValues(notePicker.getMaxSpendableNoteValues(), [10n, 9n, 7n, 6n, 3n, 2n, 1n]);
      expectValues(notePicker.getMaxSpendableNoteValues({ numNotes: 5 }), [10n, 9n, 7n, 6n, 3n]);
      expectValues(notePicker.getMaxSpendableNoteValues({ numNotes: 2 }), [10n, 9n]);
      expectValues(notePicker.getMaxSpendableNoteValues({ numNotes: 1 }), [10n]);
    });

    it('get the sum of the n largest spendable registered notes', () => {
      const notePicker = new NotePicker(mixedNotes);
      expectValues(notePicker.getMaxSpendableNoteValues({ spendingKeyRequired }), [19n, 17n, 5n]);
      expectValues(notePicker.getMaxSpendableNoteValues({ spendingKeyRequired, numNotes: 2 }), [19n, 17n]);
      expectValues(notePicker.getMaxSpendableNoteValues({ spendingKeyRequired, numNotes: 1 }), [19n]);
    });

    it('get the sum of the n largest spendable notes without excluded notes', () => {
      {
        const excludedNullifiers = computeNullifiers([10n, 7n, 6n]);
        expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers }), [9n, 4n, 3n, 2n, 1n]);
        expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers, numNotes: 2 }), [9n, 4n]);
        expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers, numNotes: 1 }), [9n]);
      }
      {
        // exclude all but 3n
        const excludedNullifiers = computeNullifiers([1n, 2n, 4n, 6n, 7n, 9n, 10n]);
        expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers }), [3n]);
        expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers, numNotes: 2 }), [3n]);
        expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers, numNotes: 1 }), [3n]);
      }
    });

    it('get the sum of the n largest spendable notes excluding pending notes', () => {
      const excludedNullifiers = computeNullifiers([7n, 9n, 10n]);
      expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers, excludePendingNotes }), [3n, 2n, 1n]);
      expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers, excludePendingNotes, numNotes: 2 }), [
        3n,
        2n,
      ]);
      expectValues(notePicker.getMaxSpendableNoteValues({ excludedNullifiers, excludePendingNotes, numNotes: 1 }), [
        3n,
      ]);
    });
  });
});

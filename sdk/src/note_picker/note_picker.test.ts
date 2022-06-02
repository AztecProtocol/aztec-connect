import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { NotePicker } from './';
import { Note } from '../note';

const computeNullifier = (value: bigint) => toBufferBE(value, 32);

const computeNullifiers = (values: bigint[]) => values.map(computeNullifier);

const randomNote = (value: bigint, allowChain = false, pending = false, ownerAccountRequired = true) =>
  ({
    value,
    nullifier: computeNullifier(value),
    allowChain,
    pending,
    ownerAccountRequired,
  } as Note);

const randomUnsafeNote = (value: bigint, allowChain = false, pending = false) =>
  randomNote(value, allowChain, pending, false);

const randomNotes = (values: bigint[]) => values.map(value => randomNote(value));

const expectNoteValues = (notes: Note[], values: bigint[] = []) => {
  expect(notes).toEqual(values.map(value => expect.objectContaining({ value })));
};

describe('NotePicker', () => {
  const allowChain = true;
  const pending = true;
  const unsafe = true;
  const notes = randomNotes([10n, 1n, 7n, 9n, 3n, 2n]);
  const excludePendingNotes = true;
  const mixedNotes = [
    randomNote(11n, false, false),
    randomUnsafeNote(19n, false, false),
    randomNote(23n, true, false),
    randomUnsafeNote(17n, true, false),
    randomNote(7n, false, true),
    randomUnsafeNote(3n, false, true),
    randomNote(13n, true, true),
    randomUnsafeNote(5n, true, true),
  ];

  describe('pick', () => {
    it('pick no more than 2 notes whose sum is equal to or larger than the required sum', () => {
      const notePicker = new NotePicker(notes);
      expectNoteValues(notePicker.pick(20n), []);
      expectNoteValues(notePicker.pick(15n), [7n, 9n]);
      expectNoteValues(notePicker.pick(10n), [3n, 7n]);
      expectNoteValues(notePicker.pick(7n), [7n]);
    });

    it('pick a pair of notes that contains at most one pending note with allowChain set to true', () => {
      const pendingNotes = [
        randomNote(5n, allowChain, pending),
        randomNote(4n, allowChain, pending),
        randomNote(6n, allowChain, pending),
      ];
      const notePicker = new NotePicker([...notes, ...pendingNotes]);
      expectNoteValues(notePicker.pick(11n), [4n, 7n]);
    });

    it('will not pick a pending note if excluded', () => {
      const pendingNotes = [randomNote(4n, allowChain, pending)];
      const notePicker = new NotePicker([...notes, ...pendingNotes]);
      expectNoteValues(notePicker.pick(11n, [], excludePendingNotes), [2n, 9n]);
    });

    it('will not pick a pending note with allowChain set to false', () => {
      const pendingNotes = [randomNote(4n, false, pending)];
      const notePicker = new NotePicker([...notes, ...pendingNotes]);
      expectNoteValues(notePicker.pick(11n), [2n, 9n]);
    });

    it('will not pick excluded notes', () => {
      const notePicker = new NotePicker(notes);
      expectNoteValues(notePicker.pick(10n), [3n, 7n]);
      {
        const excludeNullifiers = computeNullifiers([7n]);
        expectNoteValues(notePicker.pick(10n, excludeNullifiers), [1n, 9n]);
      }
      {
        const excludeNullifiers = computeNullifiers([1n, 3n]);
        expectNoteValues(notePicker.pick(10n, excludeNullifiers), [10n]);
      }
      {
        const excludeNullifiers = computeNullifiers([7n, 9n, 10n]);
        expectNoteValues(notePicker.pick(10n, excludeNullifiers), []);
      }
    });

    it('pick a settled note if there is more than one note with the exact value', () => {
      const pendingNotes = [randomNote(7n, allowChain, pending)];
      const notePicker = new NotePicker([...notes, ...pendingNotes]);
      expect(notePicker.pick(7n)).toEqual([expect.objectContaining({ value: 7n, pending: false })]);
    });

    it('pick unsafe notes', () => {
      const notePicker = new NotePicker(mixedNotes);
      expectNoteValues(notePicker.pick(7n, [], false, unsafe), [5n, 19n]);
      expectNoteValues(notePicker.pick(7n, [], excludePendingNotes, unsafe), [17n, 19n]);
    });
  });

  describe('pickOne', () => {
    const pendingNotes = [randomNote(5n, false, true), randomNote(4n, true, true), randomNote(6n, true, true)];
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
      expect(notePicker.pickOne(6n, [], excludePendingNotes)!.value).toBe(7n);
      expect(notePicker.pickOne(5n, [], excludePendingNotes)!.value).toBe(7n);
      expect(notePicker.pickOne(4n, [], excludePendingNotes)!.value).toBe(7n);
      expect(notePicker.pickOne(2n, [], excludePendingNotes)!.value).toBe(2n);
    });

    it('will not pick excluded note', () => {
      const excludeNullifiers = computeNullifiers([2n, 6n, 7n]);
      expect(notePicker.pickOne(5n, excludeNullifiers)!.value).toBe(9n);
      expect(notePicker.pickOne(2n, excludeNullifiers)!.value).toBe(3n);
    });

    it('pick a settled note if there is more than one note with the same value', () => {
      const notes = [randomNote(4n, false, true), randomNote(4n, false, false), randomNote(4n, true, true)];
      const notePicker = new NotePicker(notes);
      expect(notePicker.pickOne(4n)).toEqual(expect.objectContaining({ value: 4n, allowChain: false, pending: false }));
      expect(notePicker.pickOne(3n)).toEqual(expect.objectContaining({ value: 4n, allowChain: false, pending: false }));
    });

    it('pick unsafe notes if specified', () => {
      const notePicker = new NotePicker(mixedNotes);
      expect(notePicker.pickOne(7n, [], false, unsafe)!.value).toBe(17n);
    });
  });

  describe('getSum', () => {
    it('calculate the sum of settled notes', () => {
      {
        const notePicker = new NotePicker(notes);
        expect(notePicker.getSum()).toBe(32n);
      }
      {
        const notePicker = new NotePicker([...notes, randomNote(5n, false, true), randomNote(4n, true, true)]);
        expect(notePicker.getSum()).toBe(32n);
      }
    });

    it('calculate the sum of settled unsafe notes', () => {
      const notePicker = new NotePicker(mixedNotes);
      expect(notePicker.getSum(unsafe)).toBe(19n + 17n);
    });
  });

  describe('getSpendableSum', () => {
    const notePicker = new NotePicker([
      ...notes,
      randomNote(5n, false, true),
      randomNote(4n, true, true),
      randomNote(6n, false, true),
    ]);

    it('calculate the sum of spendable notes', () => {
      expect(notePicker.getSpendableSum()).toBe(36n);
      {
        const excludeNullifiers = computeNullifiers([10n, 7n]);
        expect(notePicker.getSpendableSum(excludeNullifiers)).toBe(19n);
      }
      {
        const excludeNullifiers = computeNullifiers([2n, 4n]);
        expect(notePicker.getSpendableSum(excludeNullifiers)).toBe(30n);
      }
      {
        const excludeNullifiers = computeNullifiers([2n, 4n, 5n]);
        expect(notePicker.getSpendableSum(excludeNullifiers)).toBe(30n);
      }
    });

    it('calculate the sum of spendable notes excluding pending notes', () => {
      const excludePendingNotes = true;
      expect(notePicker.getSpendableSum([], excludePendingNotes)).toBe(32n);
    });

    it('calculate the sum of spendable unsafe notes', () => {
      const notePicker = new NotePicker(mixedNotes);
      expect(notePicker.getSpendableSum([], false, unsafe)).toBe(19n + 17n + 5n);
    });
  });

  describe('getMaxSpendableValue', () => {
    const notePicker = new NotePicker([
      ...notes,
      randomNote(5n, false, true),
      randomNote(4n, true, true),
      randomNote(6n, true, true),
    ]);

    it('get the sum of the 2 largest spendable notes', () => {
      expect(notePicker.getMaxSpendableValue()).toBe(10n + 9n);
    });

    it('get the sum of the 2 largest spendable unsafe notes', () => {
      const notePicker = new NotePicker(mixedNotes);
      expect(notePicker.getMaxSpendableValue([], 2, false, unsafe)).toBe(19n + 17n);
    });

    it('get the sum of the 2 largest spendable notes without excluded notes', () => {
      {
        const excludeNullifiers = computeNullifiers([10n, 7n, 6n]);
        expect(notePicker.getMaxSpendableValue(excludeNullifiers)).toBe(9n + 4n);
      }
      {
        // exclude all but 3n
        const excludeNullifiers = computeNullifiers([1n, 2n, 4n, 6n, 7n, 9n, 10n]);
        expect(notePicker.getMaxSpendableValue(excludeNullifiers)).toBe(3n);
      }
    });

    it('get the sum of the 2 largest spendable notes including at most one pending note', () => {
      const excludeNullifiers = computeNullifiers([7n, 9n, 10n]);
      expect(notePicker.getMaxSpendableValue(excludeNullifiers)).toBe(6n + 3n);
    });

    it('get the sum of the 2 largest spendable notes excluding pending notes', () => {
      const excludeNullifiers = computeNullifiers([7n, 9n, 10n]);
      const excludePendingNotes = true;
      expect(notePicker.getMaxSpendableValue(excludeNullifiers, 2, excludePendingNotes)).toBe(3n + 2n);
    });

    it('find the value of the largest spendable note', () => {
      const numNotes = 1;
      expect(notePicker.getMaxSpendableValue([], numNotes)).toBe(10n);
    });

    it('find the value of the largest spendable note without excluded notes', () => {
      const numNotes = 1;
      {
        const excludeNullifiers = computeNullifiers([10n, 7n]);
        expect(notePicker.getMaxSpendableValue(excludeNullifiers, numNotes)).toBe(9n);
      }
      {
        // exclude all but 3n
        const excludeNullifiers = computeNullifiers([1n, 2n, 4n, 6n, 7n, 9n, 10n]);
        expect(notePicker.getMaxSpendableValue(excludeNullifiers, numNotes)).toBe(3n);
      }
    });

    it('find the value of the largest spendable note excluding pending notes', () => {
      const numNotes = 1;
      const excludeNullifiers = computeNullifiers([10n, 9n, 7n]);
      const excludePendingNotes = true;
      expect(notePicker.getMaxSpendableValue(excludeNullifiers, numNotes, excludePendingNotes)).toBe(3n);
    });

    it('find the value of the largest spendable unsafe note', () => {
      const numNotes = 1;
      const notePicker = new NotePicker(mixedNotes);
      expect(notePicker.getMaxSpendableValue([], numNotes, false, unsafe)).toBe(19n);
    });

    it('throw if try to get max spendable value with invalid numNotes', () => {
      const notePicker = new NotePicker(notes);
      expect(() => notePicker.getMaxSpendableValue([], 0)).toThrow();
      expect(() => notePicker.getMaxSpendableValue([], 3)).toThrow();
    });
  });
});

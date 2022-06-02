import { Note } from '../note';
import { SortedNotes } from './sorted_notes';

describe('sorted notes', () => {
  const createNote = (value: bigint, pending = false) =>
    ({
      value,
      pending,
    } as Note);

  const createNotes = (values: bigint[]) => values.map(value => createNote(value));

  const expectNoteValues = (sortedNotes: SortedNotes, values: bigint[] = []) => {
    expect(sortedNotes.notes).toEqual(values.map(value => expect.objectContaining({ value })));
  };

  it('sort the notes by value in ascending order', () => {
    const notes = createNotes([4n, 5n, 2n, 10n, 4n, 0n]);
    const sortedNotes = new SortedNotes(notes);
    expectNoteValues(sortedNotes, [0n, 2n, 4n, 4n, 5n, 10n]);
  });

  it('place pending notes first if have same values', () => {
    const notes = [
      createNote(4n, true),
      createNote(7n),
      createNote(10n, true),
      createNote(4n),
      createNote(5n),
      createNote(4n, true),
      createNote(7n, true),
      createNote(7n),
    ];
    const sortedNotes = new SortedNotes(notes);
    expect(sortedNotes.notes).toEqual([
      { value: 4n, pending: true },
      { value: 4n, pending: true },
      { value: 4n, pending: false },
      { value: 5n, pending: false },
      { value: 7n, pending: true },
      { value: 7n, pending: false },
      { value: 7n, pending: false },
      { value: 10n, pending: true },
    ]);
  });

  it('add a note to the sorted array', () => {
    const notes = createNotes([5n, 2n]);
    const sortedNotes = new SortedNotes(notes);
    expectNoteValues(sortedNotes, [2n, 5n]);

    sortedNotes.add(createNote(3n));
    expectNoteValues(sortedNotes, [2n, 3n, 5n]);

    sortedNotes.add(createNote(6n));
    expectNoteValues(sortedNotes, [2n, 3n, 5n, 6n]);

    sortedNotes.add(createNote(1n));
    expectNoteValues(sortedNotes, [1n, 2n, 3n, 5n, 6n]);

    sortedNotes.add(createNote(3n));
    expectNoteValues(sortedNotes, [1n, 2n, 3n, 3n, 5n, 6n]);
  });

  it('add a pending note to the sorted array', () => {
    const notes = createNotes([5n, 2n]);
    const sortedNotes = new SortedNotes(notes);
    expectNoteValues(sortedNotes, [2n, 5n]);

    sortedNotes.add(createNote(3n, true));
    expect(sortedNotes.notes).toEqual([
      { value: 2n, pending: false },
      { value: 3n, pending: true },
      { value: 5n, pending: false },
    ]);

    sortedNotes.add(createNote(3n, false));
    expect(sortedNotes.notes).toEqual([
      { value: 2n, pending: false },
      { value: 3n, pending: true },
      { value: 3n, pending: false },
      { value: 5n, pending: false },
    ]);

    sortedNotes.add(createNote(3n, true));
    expect(sortedNotes.notes).toEqual([
      { value: 2n, pending: false },
      { value: 3n, pending: true },
      { value: 3n, pending: true },
      { value: 3n, pending: false },
      { value: 5n, pending: false },
    ]);
  });
});

import { SortedNotes } from './sorted_notes.js';
import { pick } from './pick.js';
import { Note } from '../note/index.js';

const noteSum = (notes: Note[]) => notes.reduce((sum, { value }) => sum + value, BigInt(0));

interface NotePickerOptions {
  excludedNullifiers?: Buffer[];
  excludePendingNotes?: boolean;
  ownerAccountRequired?: boolean;
}

export class NotePicker {
  private readonly spendableNotes: SortedNotes;
  private readonly settledNotes: SortedNotes;
  private readonly unregisteredSpendableNotes: SortedNotes;
  private readonly unregisteredSettledNotes: SortedNotes;

  constructor(notes: Note[] = []) {
    const registeredNotes = notes.filter(n => n.ownerAccountRequired);
    this.spendableNotes = new SortedNotes(registeredNotes.filter(n => !n.pending || n.allowChain));
    this.settledNotes = new SortedNotes(registeredNotes.filter(n => !n.pending));

    const unregisteredNotes = notes.filter(n => !n.ownerAccountRequired);
    this.unregisteredSpendableNotes = new SortedNotes(unregisteredNotes.filter(n => !n.pending || n.allowChain));
    this.unregisteredSettledNotes = new SortedNotes(unregisteredNotes.filter(n => !n.pending));
  }

  public pick(
    value: bigint,
    { excludedNullifiers = [], excludePendingNotes, ownerAccountRequired }: NotePickerOptions = {},
  ): Note[] {
    const maxNotes = this.getMaxSpendableNotes(excludedNullifiers, excludePendingNotes, ownerAccountRequired, 2);
    const maxValue = noteSum(maxNotes);
    if (!maxValue) {
      return [];
    }

    if (value > maxValue) {
      const notes = [
        ...this.pick(value - maxValue, {
          excludedNullifiers: [...excludedNullifiers, ...maxNotes.map(n => n.nullifier)],
          excludePendingNotes: excludePendingNotes || maxNotes.some(n => n.pending),
          ownerAccountRequired,
        }),
        ...maxNotes,
      ];
      return noteSum(notes) >= value ? notes : [];
    }

    const spendableNotes = this.getSortedNotes(excludedNullifiers, excludePendingNotes, ownerAccountRequired);
    const notes = pick(spendableNotes, value) || [];
    const sum = noteSum(notes);
    if (sum === value) {
      return notes;
    }
    const note = spendableNotes.findLast(n => n.value === value);
    return note ? [note] : notes;
  }

  public pickOne(
    value: bigint,
    { excludedNullifiers, excludePendingNotes, ownerAccountRequired }: NotePickerOptions = {},
  ) {
    const settledNote = this.getSortedNotes(excludedNullifiers, true, ownerAccountRequired).find(n => n.value >= value);
    if (excludePendingNotes) {
      return settledNote;
    }

    const pendingNote = this.getSortedNotes(excludedNullifiers, false, ownerAccountRequired).find(
      n => n.value >= value,
    );
    if (!settledNote || !pendingNote) {
      return settledNote || pendingNote;
    }
    return settledNote.value <= pendingNote.value ? settledNote : pendingNote;
  }

  public getSum() {
    return noteSum(this.settledNotes.notes) + noteSum(this.unregisteredSettledNotes.notes);
  }

  public getSpendableNoteValues({
    excludedNullifiers,
    excludePendingNotes,
    ownerAccountRequired,
  }: NotePickerOptions = {}) {
    const { notes } = this.getSortedNotes(excludedNullifiers, excludePendingNotes, ownerAccountRequired);
    return notes.map(n => n.value);
  }

  public getMaxSpendableNoteValues({
    excludedNullifiers,
    excludePendingNotes,
    ownerAccountRequired,
    numNotes,
  }: NotePickerOptions & { numNotes?: number } = {}) {
    const notes = this.getMaxSpendableNotes(excludedNullifiers, excludePendingNotes, ownerAccountRequired, numNotes);
    return notes.map(n => n.value);
  }

  private getMaxSpendableNotes(
    excludedNullifiers: Buffer[] = [],
    excludePendingNotes = false,
    ownerAccountRequired = false,
    numNotes?: number,
  ) {
    const spendableNotes = this.getSortedNotes(excludedNullifiers, excludePendingNotes, ownerAccountRequired);
    const notes: Note[] = [];
    let hasPendingNote = false;
    spendableNotes.findLast(note => {
      if (!note.pending || !hasPendingNote) {
        notes.push(note);
        hasPendingNote = hasPendingNote || note.pending;
      }
      return notes.length === numNotes;
    });
    return notes;
  }

  private getSortedNotes(excludedNullifiers: Buffer[] = [], excludePendingNotes = false, ownerAccountRequired = false) {
    const [settledNotes, spendableNotes] = ownerAccountRequired
      ? [this.settledNotes, this.spendableNotes]
      : [this.unregisteredSettledNotes, this.unregisteredSpendableNotes];
    const notes = excludePendingNotes ? settledNotes : spendableNotes;
    return notes.filter(({ nullifier }) => !excludedNullifiers.some(n => n.equals(nullifier)));
  }
}

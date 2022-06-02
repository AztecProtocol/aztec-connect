import { SortedNotes } from './sorted_notes';
import { pick } from './pick';
import { Note } from '../note';

const noteSum = (notes: Note[]) => notes.reduce((sum, { value }) => sum + value, BigInt(0));

export class NotePicker {
  private readonly spendableNotes: SortedNotes;
  private readonly settledNotes: SortedNotes;
  private readonly unsafeSpendableNotes: SortedNotes;
  private readonly unsafeSettledNotes: SortedNotes;

  constructor(readonly notes: Note[] = []) {
    const safeNotes = notes.filter(n => n.ownerAccountRequired);
    this.spendableNotes = new SortedNotes(safeNotes.filter(n => !n.pending || n.allowChain));
    this.settledNotes = new SortedNotes(safeNotes.filter(n => !n.pending));

    const unsafeNotes = notes.filter(n => !n.ownerAccountRequired);
    this.unsafeSpendableNotes = new SortedNotes(unsafeNotes.filter(n => !n.pending || n.allowChain));
    this.unsafeSettledNotes = new SortedNotes(unsafeNotes.filter(n => !n.pending));
  }

  pick(value: bigint, excludeNullifiers?: Buffer[], excludePendingNotes = false, unsafe = false) {
    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes, unsafe);
    const notes = pick(spendableNotes, value) || [];
    const sum = noteSum(notes);
    if (sum === value) {
      return notes;
    }
    const note = spendableNotes.findLast(n => n.value === value);
    return note ? [note] : notes;
  }

  pickOne(value: bigint, excludeNullifiers?: Buffer[], excludePendingNotes = false, unsafe = false) {
    const settledNote = this.getSortedNotes(excludeNullifiers, true, unsafe).find(n => n.value >= value);
    if (excludePendingNotes) {
      return settledNote;
    }

    const pendingNote = this.getSortedNotes(excludeNullifiers, false, unsafe).find(n => n.value >= value);
    if (!settledNote || !pendingNote) {
      return settledNote || pendingNote;
    }
    return settledNote.value <= pendingNote.value ? settledNote : pendingNote;
  }

  getSum(unsafe = false) {
    return noteSum(unsafe ? this.unsafeSettledNotes.notes : this.settledNotes.notes);
  }

  getSpendableSum(excludeNullifiers?: Buffer[], excludePendingNotes = false, unsafe = false) {
    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes, unsafe);
    return noteSum(spendableNotes.notes);
  }

  getMaxSpendableValue(excludeNullifiers?: Buffer[], numNotes = 2, excludePendingNotes = false, unsafe = false) {
    if (numNotes <= 0 || numNotes > 2) {
      throw new Error('`numNotes` can only be 1 or 2.');
    }

    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes, unsafe);
    const notes: Note[] = [];
    let hasPendingNote = false;
    spendableNotes.findLast(note => {
      if (!note.pending || !hasPendingNote) {
        notes.push(note);
      }
      hasPendingNote = hasPendingNote || note.pending;
      return notes.length === numNotes;
    });
    return noteSum(notes);
  }

  private getSortedNotes(excludeNullifiers: Buffer[] = [], excludePendingNotes: boolean, unsafe: boolean) {
    const [settledNotes, spendableNotes] = unsafe
      ? [this.unsafeSettledNotes, this.unsafeSpendableNotes]
      : [this.settledNotes, this.spendableNotes];
    const notes = excludePendingNotes ? settledNotes : spendableNotes;
    return notes.filter(({ nullifier }) => !excludeNullifiers.some(n => n.equals(nullifier)));
  }
}

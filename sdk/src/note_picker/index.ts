import { SortedNotes } from './sorted_notes';
import { pick } from './pick';
import { Note } from '../note';

const noteSum = (notes: Note[]) => notes.reduce((sum, { value }) => sum + value, BigInt(0));

export class NotePicker {
  private readonly spendableNotes: SortedNotes;
  private readonly settledNotes: SortedNotes;

  constructor(readonly notes: Note[] = []) {
    this.spendableNotes = new SortedNotes(notes.filter(n => !n.pending || n.allowChain));
    this.settledNotes = new SortedNotes(notes.filter(n => !n.pending));
  }

  pick(value: bigint, excludeNullifiers?: Buffer[], excludePendingNotes?: boolean) {
    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes);
    const notes = pick(spendableNotes, value) || [];
    const sum = noteSum(notes);
    if (sum === value) {
      return notes;
    }
    const note = spendableNotes.findLast(n => n.value === value);
    return note ? [note] : notes;
  }

  pickOne(value: bigint, excludeNullifiers?: Buffer[], excludePendingNotes?: boolean) {
    const settledNote = this.getSortedNotes(excludeNullifiers, true).find(n => n.value >= value);
    if (excludePendingNotes) {
      return settledNote;
    }

    const pendingNote = this.getSortedNotes(excludeNullifiers, false).find(n => n.value >= value);
    if (!settledNote || !pendingNote) {
      return settledNote || pendingNote;
    }
    return settledNote.value <= pendingNote.value ? settledNote : pendingNote;
  }

  getSum() {
    return noteSum(this.settledNotes.notes);
  }

  getSpendableSum(excludeNullifiers?: Buffer[], excludePendingNotes?: boolean) {
    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes);
    return noteSum(spendableNotes.notes);
  }

  getMaxSpendableValue(excludeNullifiers?: Buffer[], numNotes = 2, excludePendingNotes?: boolean) {
    if (numNotes <= 0 || numNotes > 2) {
      throw new Error('`numNotes` can only be 1 or 2.');
    }

    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes);
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

  private getSortedNotes(excludeNullifiers: Buffer[] = [], excludePendingNotes = false) {
    const notes = excludePendingNotes ? this.settledNotes : this.spendableNotes;
    return notes.filter(({ nullifier }) => !excludeNullifiers.some(n => n.equals(nullifier)));
  }
}

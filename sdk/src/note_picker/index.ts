import { SortedNotes } from './sorted_notes';
import { pick } from './pick';
import { Note } from '../note';

const noteSum = (notes: Note[]) => notes.reduce((sum, { value }) => sum + value, BigInt(0));

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

  pick(value: bigint, excludeNullifiers?: Buffer[], excludePendingNotes = false, ownerAccountRequired = false) {
    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes, ownerAccountRequired);
    const notes = pick(spendableNotes, value) || [];
    const sum = noteSum(notes);
    if (sum === value) {
      return notes;
    }
    const note = spendableNotes.findLast(n => n.value === value);
    return note ? [note] : notes;
  }

  pickOne(value: bigint, excludeNullifiers?: Buffer[], excludePendingNotes = false, ownerAccountRequired = false) {
    const settledNote = this.getSortedNotes(excludeNullifiers, true, ownerAccountRequired).find(n => n.value >= value);
    if (excludePendingNotes) {
      return settledNote;
    }

    const pendingNote = this.getSortedNotes(excludeNullifiers, false, ownerAccountRequired).find(n => n.value >= value);
    if (!settledNote || !pendingNote) {
      return settledNote || pendingNote;
    }
    return settledNote.value <= pendingNote.value ? settledNote : pendingNote;
  }

  getSum() {
    return noteSum(this.settledNotes.notes) + noteSum(this.unregisteredSettledNotes.notes);
  }

  getSpendableSum(excludeNullifiers?: Buffer[], excludePendingNotes = false, ownerAccountRequired = false) {
    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes, ownerAccountRequired);
    return noteSum(spendableNotes.notes);
  }

  getMaxSpendableValue(
    excludeNullifiers?: Buffer[],
    numNotes = 2,
    excludePendingNotes = false,
    ownerAccountRequired = false,
  ) {
    if (numNotes <= 0 || numNotes > 2) {
      throw new Error('`numNotes` can only be 1 or 2.');
    }

    const spendableNotes = this.getSortedNotes(excludeNullifiers, excludePendingNotes, ownerAccountRequired);
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

  private getSortedNotes(
    excludeNullifiers: Buffer[] = [],
    excludePendingNotes: boolean,
    ownerAccountRequired: boolean,
  ) {
    const [settledNotes, spendableNotes] = ownerAccountRequired
      ? [this.settledNotes, this.spendableNotes]
      : [this.unregisteredSettledNotes, this.unregisteredSpendableNotes];
    const notes = excludePendingNotes ? settledNotes : spendableNotes;
    return notes.filter(({ nullifier }) => !excludeNullifiers.some(n => n.equals(nullifier)));
  }
}

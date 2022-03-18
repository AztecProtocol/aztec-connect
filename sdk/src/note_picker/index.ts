import { SortedNotes } from './sorted_notes';
import { pick } from './pick';
import { Note } from '../note';

const noteSum = (notes: Note[]) => notes.reduce((sum, { value }) => sum + value, BigInt(0));

export class NotePicker {
  private readonly spendableNotes: SortedNotes;
  private readonly settledNotes: Note[];
  private readonly numNotesPerTx = 2;

  constructor(readonly notes: Note[] = []) {
    this.spendableNotes = new SortedNotes(notes.filter(n => !n.pending || n.allowChain));
    this.settledNotes = notes.filter(n => !n.pending);
  }

  getSpendableNotes(excludeNullifiers?: Buffer[]) {
    return excludeNullifiers?.length
      ? this.spendableNotes.filter(({ nullifier }) => !excludeNullifiers.some(n => n.equals(nullifier)))
      : this.spendableNotes;
  }

  pick(value: bigint, excludeNullifiers?: Buffer[]) {
    const spendableNotes = this.getSpendableNotes(excludeNullifiers);
    const notes = pick(spendableNotes, value);
    const sum = noteSum(notes || []);
    if (sum === value) {
      return notes;
    }
    const note = spendableNotes.find(n => n.value === value);
    return note ? [note] : notes;
  }

  getSum() {
    return noteSum(this.settledNotes);
  }

  getSpendableSum(excludeNullifiers?: Buffer[]) {
    const spendableNotes = this.getSpendableNotes(excludeNullifiers);
    return noteSum(spendableNotes.notes);
  }

  getMaxSpendableValue(excludeNullifiers?: Buffer[]) {
    const spendableNotes = this.getSpendableNotes(excludeNullifiers);
    const notes = spendableNotes.last(this.numNotesPerTx);
    return noteSum(notes);
  }
}

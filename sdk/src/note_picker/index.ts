import { SortedNotes } from './sorted_notes';
import { pick } from './pick';
import { Note } from '../note';

const noteSum = (notes: Note[]) => notes.reduce((sum, { value }) => sum + value, BigInt(0));

export class NotePicker {
  private spendableNotes: SortedNotes;
  private numNotesPerTx = 2;

  constructor(private notes: Note[] = [], excludeIndices: number[] = []) {
    const availableNotes = notes.filter(({ index }) => excludeIndices.indexOf(index) < 0);
    this.spendableNotes = new SortedNotes(availableNotes);
  }

  getSpendableNotes(excludeNullifiers?: Buffer[]) {
    return excludeNullifiers?.length
      ? this.spendableNotes.filter(({ nullifier }) => !excludeNullifiers.some(n => n.equals(nullifier)))
      : this.spendableNotes;
  }

  pick(value: bigint, excludeNullifiers?: Buffer[]) {
    const spendableNotes = this.getSpendableNotes(excludeNullifiers);
    return pick(spendableNotes, value);
  }

  getSum() {
    return noteSum(this.notes);
  }

  getSpendableSum(excludeNullifiers?: Buffer[]) {
    const spendableNotes = this.getSpendableNotes(excludeNullifiers);
    return noteSum(spendableNotes.notes);
  }

  getMaxSpendableValue(excludeNullifiers?: Buffer[]) {
    const spendableNotes = this.getSpendableNotes(excludeNullifiers);
    const notes = spendableNotes.slice(-this.numNotesPerTx);
    return noteSum(notes);
  }
}

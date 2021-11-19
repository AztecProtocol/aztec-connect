import { SortedNotes } from './sorted_notes';
import { pick } from './pick';
import { Note } from '../note';

const noteSum = (notes: Note[]) => notes.reduce((sum, { value }) => sum + value, BigInt(0));

export class NotePicker {
  private readonly spendableNotes: SortedNotes;
  private readonly numNotesPerTx = 2;

  constructor(private readonly notes: Note[] = []) {
    this.spendableNotes = new SortedNotes(notes.filter(n => !n.pending || n.allowChain));
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

  pickOne(value: bigint, excludeNullifiers?: Buffer[]) {
    return this.getSpendableNotes(excludeNullifiers).find(n => n.value >= value);
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
    const notes = spendableNotes.last(this.numNotesPerTx);
    return noteSum(notes);
  }
}

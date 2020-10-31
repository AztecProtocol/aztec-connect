import { SortedNotes } from './sorted_notes';
import { pick } from './pick';
import { Note } from '../note';

export class NotePicker {
  private sortedNotes: SortedNotes;

  constructor(notes: Note[] = []) {
    this.sortedNotes = new SortedNotes(notes);
  }

  pick(value: bigint) {
    return pick(this.sortedNotes, value);
  }

  getSum() {
    let sum = BigInt(0);
    this.sortedNotes.forEach((n: Note) => (sum += n.value));
    return sum;
  }
}

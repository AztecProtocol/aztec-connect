import { TrackedNote } from './note';
import SortedNotes from './sorted_notes';
import validate from './validate';
import { pick } from './pick';

export class NotePicker {
  private sortedNotes: SortedNotes;

  constructor(notes: TrackedNote[]) {
    this.sortedNotes = new SortedNotes(notes);
  }

  addNote(note: TrackedNote) {
    this.sortedNotes.add(note);
  }

  removeNote(note: TrackedNote) {
    this.sortedNotes.remove(note);
  }

  validate(value: number, numberOfNotes: number) {
    return validate(this.sortedNotes, value, numberOfNotes);
  }

  pick(value: number, numberOfNotes: number = 2) {
    if (value === 0) {
      return [];
    }
    return pick(this.sortedNotes, value, numberOfNotes);
  }
}

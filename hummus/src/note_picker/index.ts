import { TrackedNote } from './note';
import SortedNotes from './sorted_notes';
import validate from './validate';
import { pick } from './pick';

export class NotePicker {
  private sortedNotes: SortedNotes;

  constructor(notes: TrackedNote[] = []) {
    this.sortedNotes = new SortedNotes(notes);
  }

  reset() {
    this.sortedNotes.reset();
  }

  addNote(note: TrackedNote) {
    this.sortedNotes.add(note);
  }

  addNotes(notes: TrackedNote[]) {
    this.sortedNotes.bulkAdd(notes);
  }

  removeNote(note: TrackedNote) {
    this.sortedNotes.remove(note);
  }

  hasNote(index: number) {
    return !!this.sortedNotes.find((n) => n.index === index);
  }

  findNote(callback: (note: TrackedNote, i?: number) => boolean) {
    return this.sortedNotes.find(callback);
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

  getNoteSum() {
    let sum = 0;
    this.sortedNotes.each((n: TrackedNote) => sum += n.note.value);
    return sum;
  }
}

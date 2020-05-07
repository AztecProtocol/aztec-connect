import { TrackedNote } from './tracked_note';
import { SortedNotes } from './sorted_notes';
import { pick } from './pick';

export * from './tracked_note';

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

  removeNote(index: number) {
    const note = this.sortedNotes.find(n => n.index === index);
    if (note) {
      this.sortedNotes.remove(note);
    }
    return note;
  }

  hasNote(index: number) {
    return !!this.sortedNotes.find(n => n.index === index);
  }

  findNote(callback: (note: TrackedNote, i?: number) => boolean) {
    return this.sortedNotes.find(callback);
  }

  pick(value: number) {
    if (value === 0) {
      return [];
    }
    return pick(this.sortedNotes, value);
  }

  getNoteSum() {
    let sum = 0;
    this.sortedNotes.each((n: TrackedNote) => (sum += n.note.value));
    return sum;
  }
}

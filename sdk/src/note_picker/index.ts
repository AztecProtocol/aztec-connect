import { SortedNotes } from './sorted_notes';
import { pick } from './pick';
import { Note } from '../note';

export class NotePicker {
  private sortedNotes: SortedNotes;

  constructor(notes: Note[] = []) {
    this.sortedNotes = new SortedNotes(notes);
  }

  reset() {
    this.sortedNotes.reset();
  }

  addNote(note: Note) {
    this.sortedNotes.add(note);
  }

  addNotes(notes: Note[]) {
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

  findNote(callback: (note: Note, i?: number) => boolean) {
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
    this.sortedNotes.each((n: Note) => (sum += n.value));
    return sum;
  }
}

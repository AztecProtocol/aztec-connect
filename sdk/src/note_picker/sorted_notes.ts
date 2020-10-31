import { Note } from '../note';

export class SortedNotes {
  private sortedNotes: Note[] = [];

  constructor(notes: Note[] = []) {
    this.bulkAdd(notes);
  }

  get length() {
    return this.sortedNotes.length;
  }

  get notes() {
    return [...this.sortedNotes];
  }

  add(note: Note) {
    let i = this.sortedNotes.length;
    for (; i > 0; i--) {
      if (this.nth(i - 1).value <= note.value) {
        break;
      }
    }
    this.sortedNotes.splice(i, 0, note);
  }

  bulkAdd(notes: Note[]) {
    if (!this.sortedNotes.length) {
      this.sortedNotes = [...notes].sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
    } else {
      notes.forEach(n => this.add(n));
    }
  }

  remove(note: Note) {
    const idx = this.sortedNotes.findIndex(n => n.index === note.index);
    this.sortedNotes.splice(idx, 1);
  }

  forEach(callback: (note: Note, i: number) => void) {
    this.sortedNotes.forEach((note, i) => callback(note, i));
  }

  nth(idx: number) {
    return this.sortedNotes[idx];
  }
}

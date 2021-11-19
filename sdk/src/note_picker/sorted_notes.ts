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
    return this;
  }

  bulkAdd(notes: Note[]) {
    if (!this.sortedNotes.length) {
      this.sortedNotes = [...notes].sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
    } else {
      notes.forEach(n => this.add(n));
    }
    return this;
  }

  forEach(callback: (note: Note, i: number) => void) {
    this.sortedNotes.forEach((note, i) => callback(note, i));
  }

  find(callback: (note: Note) => boolean) {
    return this.sortedNotes.find(note => callback(note));
  }

  nth(idx: number) {
    return this.sortedNotes[idx];
  }

  first(num: number) {
    return this.sortedNotes.slice(0, num);
  }

  last(num: number) {
    return this.sortedNotes.slice(-num);
  }

  filter(cb: (note: Note) => boolean) {
    const chosenNotes = this.sortedNotes.filter(cb);
    return new SortedNotes(chosenNotes);
  }

  clone() {
    return new SortedNotes(this.notes);
  }
}

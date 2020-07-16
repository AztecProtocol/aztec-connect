import { Note } from '../note';

export class SortedNotes {
  private sortedNotes: Note[] = [];

  constructor(notes: Note[] = []) {
    this.sortedNotes = [...notes].sort((a, b) => a.value - b.value);
  }

  get length(): number {
    return this.sortedNotes.length;
  }

  reset() {
    this.sortedNotes = [];
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
      this.sortedNotes = [...notes].sort((a, b) => a.value - b.value);
    } else {
      notes.forEach(n => this.add(n));
    }
  }

  remove(note: Note) {
    const idx = this.sortedNotes.findIndex(n => n.index === note.index);
    this.sortedNotes.splice(idx, 1);
  }

  each(callback: (note: Note, i: number) => void) {
    this.sortedNotes.forEach((note, i) => callback(note, i));
  }

  find(callback: (note: Note, i?: number) => boolean) {
    return this.sortedNotes.find(callback);
  }

  first(count: number): Note[] {
    return this.sortedNotes.slice(0, count);
  }

  last(count: number): Note[] {
    return this.sortedNotes.slice(-count);
  }

  nth(idx: number): Note {
    return this.sortedNotes[idx];
  }

  indexOfValue(value: number, start?: number): number {
    return this.sortedNotes.findIndex((note, i) => (start === undefined || i >= start) && note.value === value);
  }

  lastIndexOfValue(value: number): number {
    for (let i = this.sortedNotes.length - 1; i >= 0; i--) {
      if (this.nth(i).value === value) {
        return i;
      }
    }
    return -1;
  }
}

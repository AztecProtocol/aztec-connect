import { Note } from '../note/index.js';

const noteSum = (notes: Note[]) => notes.reduce((sum, { value }) => sum + value, BigInt(0));

export interface NotePickerOptions {
  excludedNullifiers?: Buffer[];
  excludePendingNotes?: boolean;
  spendingKeyRequired?: boolean;
}

export class NotePicker {
  // Sometimes we prefer pending notes to have higher/lower index that non-pending notes with the same value
  private readonly sortedNotes: {
    pendingAreLower: Note[];
    pendingAreHigher: Note[];
  };

  constructor(notes: Note[] = []) {
    // Filter non spendable
    const validNotes = notes.filter(note => !note.pending || note.allowChain);
    this.sortedNotes = {
      pendingAreLower: this.sortNotes(validNotes, true),
      pendingAreHigher: this.sortNotes(validNotes, false),
    };
  }

  public pick(
    value: bigint,
    { excludedNullifiers, excludePendingNotes, spendingKeyRequired }: NotePickerOptions = {},
  ): Note[] {
    const filteredNotes = this.filterByOptions(this.getSortedNotes(true), {
      excludedNullifiers,
      excludePendingNotes,
      spendingKeyRequired,
    });
    let minimumNumberOfNotes = this.findMinimumNotes(value, filteredNotes);
    if (!minimumNumberOfNotes) {
      // Not enough notes
      return [];
    }
    // We can pick 2 notes with the same cost
    if (minimumNumberOfNotes === 1) {
      minimumNumberOfNotes = 2;
    }

    let pickedNotes = this.getMaxSpendableNotes(
      excludedNullifiers,
      excludePendingNotes,
      spendingKeyRequired,
      minimumNumberOfNotes,
    ).reverse();
    pickedNotes = this.reducePickedNotesValues(pickedNotes, value, {
      excludedNullifiers,
      excludePendingNotes,
      spendingKeyRequired,
    });
    const exactNoteMatch = pickedNotes.find(note => note.value === value);

    if (exactNoteMatch) {
      return [exactNoteMatch];
    } else {
      return pickedNotes;
    }
  }

  private reducePickedNotesValues(selectionToImprove: Note[], targetValue: bigint, options: NotePickerOptions) {
    const pickedNotes = selectionToImprove.slice();
    const availableNotes = this.filterByOptions(this.getSortedNotes(false), options);

    let excessValue = 0n;
    let usedNullifiers: Buffer[] = [];
    let unusedNotes: Note[] = [];
    let hasPending = false;

    for (let index = 0; index < pickedNotes.length; index++) {
      const noteToImprove = pickedNotes[index];

      excessValue = noteSum(pickedNotes) - targetValue;
      usedNullifiers = pickedNotes.map(note => note.nullifier);
      unusedNotes = availableNotes.filter(note => !usedNullifiers.includes(note.nullifier));
      hasPending = pickedNotes.some(note => note.pending);

      const minimumValue = noteToImprove.value - excessValue;
      const betterNoteIndex = unusedNotes.findIndex(
        potentallyBetterNote =>
          potentallyBetterNote.value >= minimumValue &&
          potentallyBetterNote.value < noteToImprove.value &&
          (!potentallyBetterNote.pending || !hasPending || noteToImprove.pending),
      );

      if (betterNoteIndex === -1) {
        // No better note found, cannot improve further the set
        return pickedNotes;
      }
      const betterNote = unusedNotes[betterNoteIndex];
      pickedNotes[index] = betterNote;
    }

    return pickedNotes;
  }

  private findMinimumNotes(value: bigint, notes: Note[]) {
    let minimumNotes = 0;
    let accumulatedValue = 0n;
    let hasPendingNote = false;

    for (let index = notes.length - 1; index >= 0; index--) {
      const note = notes[index];
      if (!note.pending || !hasPendingNote) {
        minimumNotes++;
        accumulatedValue += note.value;
        hasPendingNote = hasPendingNote || note.pending;

        if (accumulatedValue >= value) {
          return minimumNotes;
        }
      }
    }

    return 0;
  }

  public pickOne(value: bigint, options: NotePickerOptions = {}) {
    const filteredNotes = this.filterByOptions(this.getSortedNotes(false), options);
    return filteredNotes.find(note => note.value >= value);
  }

  public getSum() {
    return noteSum(this.getSortedNotes().filter(note => !note.pending));
  }

  public getSpendableNoteValues(options: NotePickerOptions = {}) {
    return this.filterByOptions(this.getSortedNotes(true), options).map(note => note.value);
  }

  public getMaxSpendableNoteValues({
    excludedNullifiers,
    excludePendingNotes,
    spendingKeyRequired,
    numNotes,
  }: NotePickerOptions & { numNotes?: number } = {}) {
    const notes = this.getMaxSpendableNotes(excludedNullifiers, excludePendingNotes, spendingKeyRequired, numNotes);
    return notes.map(n => n.value);
  }

  private getMaxSpendableNotes(
    excludedNullifiers: Buffer[] = [],
    excludePendingNotes = false,
    spendingKeyRequired = false,
    numNotes?: number,
  ) {
    const filteredNotes = this.filterByOptions(this.getSortedNotes(true), {
      excludedNullifiers,
      excludePendingNotes,
      spendingKeyRequired,
    });
    let hasPendingNote = false;
    const notes: Note[] = [];

    for (const note of filteredNotes.reverse()) {
      if (!note.pending || !hasPendingNote) {
        notes.push(note);
        hasPendingNote = hasPendingNote || note.pending;
      }
      if (notes.length === numNotes) {
        return notes;
      }
    }

    return notes;
  }

  private getSortedNotes(pendingAreLower = false) {
    return pendingAreLower ? this.sortedNotes.pendingAreLower : this.sortedNotes.pendingAreHigher;
  }

  private sortNotes(notes: Note[], pendingAreLower: boolean) {
    return notes.slice().sort((a, b) => {
      if (a.value < b.value) {
        return -1;
      }
      if (a.value > b.value) {
        return 1;
      }
      const pendingDiff = Number(a.pending) - Number(b.pending);
      return pendingAreLower ? -pendingDiff : pendingDiff;
    });
  }

  private filterByOptions(
    notes: Note[],
    { excludedNullifiers = [], excludePendingNotes = false, spendingKeyRequired = false }: NotePickerOptions = {},
  ) {
    return notes.filter(
      note =>
        !excludedNullifiers.some(n => n.equals(note.nullifier)) &&
        (!excludePendingNotes || !note.pending) &&
        (spendingKeyRequired ? note.spendingKeyRequired : !note.spendingKeyRequired),
    );
  }
}
